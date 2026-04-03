import { Alert, Button, Checkbox, Form, Input, Select, message } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../../services/authService";
import {
  shippingService,
  type GhnDistrict,
  type GhnProvince,
  type GhnWard,
} from "../../../services/shippingService";
import {
  userProfileService,
  type UserAddress,
  type UserProfile,
} from "../../../services/userProfileService";
import { useAuthStore } from "../../../stores/authStore";
import { getErrorMessage } from "../../../utils/errorMessage";
import {
  StoreEmptyState,
  StoreHeroSection,
  StoreInfoGrid,
  StoreInlineNote,
  StorePageShell,
  StorePanelSection,
  storeButtonClassNames,
} from "../components/StorePageChrome";

type ProfileFormValues = {
  fullName: string;
  email: string;
  phone: string;
};

type AddressFormValues = {
  label?: string;
  fullName: string;
  phone: string;
  provinceId?: number;
  districtId?: number;
  wardCode?: string;
  street: string;
  isDefault?: boolean;
};

type PasswordFormValues = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const phonePattern = /^[0-9]{10,11}$/;

const cleanText = (value?: string) => value?.trim() || "";
const normalizeLookupText = (value?: string) =>
  cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const isLookupMatch = (source: string, target: string) =>
  source === target || source.includes(target) || target.includes(source);
const toPositiveNumber = (value?: string) => {
  const parsed = Number(cleanText(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const ensureAddressId = (address: UserAddress, index: number) => ({
  ...address,
  id: cleanText(address.id) || `addr_${Date.now()}_${index}`,
});

const resolveProvinceIdFromAddress = (address: UserAddress, provinces: GhnProvince[]) => {
  const code = toPositiveNumber(address.province?.code);
  if (code && provinces.some((item) => item.ProvinceID === code)) {
    return code;
  }

  const provinceName = normalizeLookupText(address.province?.name);
  if (!provinceName) {
    return undefined;
  }

  return provinces.find((item) => isLookupMatch(normalizeLookupText(item.ProvinceName), provinceName))
    ?.ProvinceID;
};

const resolveDistrictIdFromAddress = (address: UserAddress, districts: GhnDistrict[]) => {
  const code = toPositiveNumber(address.district?.code);
  if (code && districts.some((item) => item.DistrictID === code)) {
    return code;
  }

  const districtName = normalizeLookupText(address.district?.name);
  if (!districtName) {
    return undefined;
  }

  return districts.find((item) => isLookupMatch(normalizeLookupText(item.DistrictName), districtName))
    ?.DistrictID;
};

const resolveWardCodeFromAddress = (address: UserAddress, wards: GhnWard[]) => {
  const code = cleanText(address.ward?.code);
  if (code && wards.some((item) => item.WardCode === code)) {
    return code;
  }

  const wardName = normalizeLookupText(address.ward?.name);
  if (!wardName) {
    return undefined;
  }

  return wards.find((item) => isLookupMatch(normalizeLookupText(item.WardName), wardName))
    ?.WardCode;
};

const formatAddressSummary = (address: UserAddress) => {
  const chunks = [
    cleanText(address.street),
    cleanText(address.ward?.name),
    cleanText(address.district?.name),
    cleanText(address.province?.name),
  ].filter(Boolean);

  return chunks.length > 0 ? chunks.join(", ") : "Đang cập nhật";
};

const TIER_LABEL_MAP = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
} as const;

const DEFAULT_LOYALTY: NonNullable<UserProfile["loyalty"]> = {
  tier: "bronze",
  points: 0,
  lifetimePoints: 0,
  tierExpiresAt: null,
  summary: {
    currentTier: "bronze",
    currentTierMinPoints: 0,
    nextTier: "silver",
    nextTierMinPoints: 1000,
    pointsToNextTier: 1000,
    progressToNextTier: 0,
  },
};

export function StoreAccountPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const refreshUser = useAuthStore((state) => state.refreshUser);

  const [profileForm] = Form.useForm<ProfileFormValues>();
  const [addressForm] = Form.useForm<AddressFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [provinces, setProvinces] = useState<GhnProvince[]>([]);
  const [districts, setDistricts] = useState<GhnDistrict[]>([]);
  const [wards, setWards] = useState<GhnWard[]>([]);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressPrefillSource, setAddressPrefillSource] = useState<UserAddress | null>(null);

  const selectedProvinceId = Form.useWatch("provinceId", addressForm) as number | undefined;
  const selectedDistrictId = Form.useWatch("districtId", addressForm) as number | undefined;
  const selectedWardCode = Form.useWatch("wardCode", addressForm) as string | undefined;

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    let active = true;
    const loadProfile = async () => {
      setIsProfileLoading(true);
      setProfileLoadError(null);

      try {
        const result = await userProfileService.getProfile();
        if (!active) {
          return;
        }

        setProfile(result);
        profileForm.setFieldsValue({
          fullName: result.fullName,
          email: result.email,
          phone: result.phone ?? "",
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setProfileLoadError(getErrorMessage(error, "Không tải được thông tin tài khoản"));
      } finally {
        if (active) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [isAuthenticated, profileForm, user]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let mounted = true;
    const loadProvinces = async () => {
      setLocationLoading(true);
      try {
        const provinceList = await shippingService.getGhnProvinces();
        if (!mounted) {
          return;
        }
        setProvinces(provinceList);
      } catch (error) {
        if (mounted) {
          messageApi.error(getErrorMessage(error, "Không tải được danh sách tỉnh/thành"));
        }
      } finally {
        if (mounted) {
          setLocationLoading(false);
        }
      }
    };

    void loadProvinces();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, messageApi]);

  useEffect(() => {
    if (!selectedProvinceId) {
      setDistricts([]);
      setWards([]);
      addressForm.setFieldsValue({ districtId: undefined, wardCode: undefined });
      return;
    }

    let mounted = true;
    const loadDistricts = async () => {
      setLocationLoading(true);
      try {
        const districtList = await shippingService.getGhnDistricts(selectedProvinceId);
        if (!mounted) {
          return;
        }
        setDistricts(districtList);
      } catch (error) {
        if (mounted) {
          setDistricts([]);
          addressForm.setFieldsValue({ districtId: undefined, wardCode: undefined });
          messageApi.error(getErrorMessage(error, "Không tải được danh sách quận/huyện"));
        }
      } finally {
        if (mounted) {
          setLocationLoading(false);
        }
      }
    };

    setWards([]);
    addressForm.setFieldsValue({ districtId: undefined, wardCode: undefined });
    void loadDistricts();

    return () => {
      mounted = false;
    };
  }, [addressForm, messageApi, selectedProvinceId]);

  useEffect(() => {
    if (!selectedDistrictId) {
      setWards([]);
      addressForm.setFieldsValue({ wardCode: undefined });
      return;
    }

    let mounted = true;
    const loadWards = async () => {
      setLocationLoading(true);
      try {
        const wardList = await shippingService.getGhnWards(selectedDistrictId);
        if (!mounted) {
          return;
        }
        setWards(wardList);
      } catch (error) {
        if (mounted) {
          setWards([]);
          addressForm.setFieldsValue({ wardCode: undefined });
          messageApi.error(getErrorMessage(error, "Không tải được danh sách phường/xã"));
        }
      } finally {
        if (mounted) {
          setLocationLoading(false);
        }
      }
    };

    addressForm.setFieldsValue({ wardCode: undefined });
    void loadWards();

    return () => {
      mounted = false;
    };
  }, [addressForm, messageApi, selectedDistrictId]);

  useEffect(() => {
    if (!addressPrefillSource || !selectedProvinceId || selectedDistrictId || districts.length === 0) {
      return;
    }

    const districtId = resolveDistrictIdFromAddress(addressPrefillSource, districts);
    if (districtId) {
      addressForm.setFieldsValue({ districtId });
      return;
    }

    setAddressPrefillSource(null);
  }, [addressForm, addressPrefillSource, districts, selectedDistrictId, selectedProvinceId]);

  useEffect(() => {
    if (!addressPrefillSource || !selectedDistrictId || selectedWardCode || wards.length === 0) {
      return;
    }

    const wardCode = resolveWardCodeFromAddress(addressPrefillSource, wards);
    if (wardCode) {
      addressForm.setFieldsValue({ wardCode });
    }
    setAddressPrefillSource(null);
  }, [addressForm, addressPrefillSource, selectedDistrictId, selectedWardCode, wards]);

  if (!isAuthenticated || !user) {
    return (
      <StoreEmptyState
        kicker="Tài khoản Rio"
        title="Bạn chưa đăng nhập"
        description="Đăng nhập để quản lý thông tin tài khoản, địa chỉ giao hàng và lịch sử mua sắm."
        action={
          <Link to="/login">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Đăng nhập
            </Button>
          </Link>
        }
      />
    );
  }

  const accountProfile: UserProfile = profile ?? {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    addresses: [],
    defaultAddressId: "",
    loyalty: DEFAULT_LOYALTY,
  };
  const loyalty = accountProfile.loyalty ?? DEFAULT_LOYALTY;
  const tierLabel = TIER_LABEL_MAP[loyalty.tier] ?? "Bronze";
  const nextTierLabel = loyalty.summary?.nextTier
    ? TIER_LABEL_MAP[loyalty.summary.nextTier] ?? loyalty.summary.nextTier
    : null;

  const currentDefaultAddressId =
    cleanText(accountProfile.defaultAddressId) ||
    accountProfile.addresses.find((item) => item.isDefault)?.id ||
    "";

  const profileCards = [
    {
      label: "Họ tên",
      value: accountProfile.fullName,
      description: "Tên hiển thị trên hóa đơn và thông báo.",
    },
    {
      label: "Email",
      value: accountProfile.email,
      description: "Kênh nhận cập nhật đơn hàng và thông tin ưu đãi.",
    },
    {
      label: "Số điện thoại",
      value: accountProfile.phone || "Đang cập nhật",
      description: "Sử dụng cho xác nhận giao hàng và hỗ trợ nhanh.",
    },
    {
      label: "Loại tài khoản",
      value: user.accountType,
      description: "Trạng thái hiện tại của tài khoản trên hệ thống RioShop.",
    },
    {
      label: "Hạng thành viên",
      value: tierLabel,
      description: nextTierLabel
        ? `Còn ${loyalty.summary?.pointsToNextTier ?? 0} điểm để lên ${nextTierLabel}.`
        : "Bạn đang ở hạng cao nhất.",
    },
    {
      label: "Điểm hiện có",
      value: `${Number(loyalty.points || 0).toLocaleString("vi-VN")} điểm`,
      description: "Điểm có thể dùng cho các chương trình loyalty trong tương lai.",
    },
    {
      label: "Điểm tích lũy",
      value: `${Number(loyalty.lifetimePoints || 0).toLocaleString("vi-VN")} điểm`,
      description: "Điểm trọn đời dùng để xét hạng thành viên.",
    },
  ];

  const handleStartEditAddress = (address: UserAddress, isDefault: boolean) => {
    const normalizedAddress = ensureAddressId(address, 0);
    const provinceId = resolveProvinceIdFromAddress(normalizedAddress, provinces);
    if (!provinceId) {
      messageApi.warning("Không thể nhận diện tỉnh/thành cho địa chỉ này. Vui lòng tạo lại địa chỉ.");
      return;
    }

    setEditingAddressId(normalizedAddress.id);
    setAddressPrefillSource(normalizedAddress);
    setDistricts([]);
    setWards([]);
    addressForm.setFieldsValue({
      label: cleanText(normalizedAddress.label) || undefined,
      fullName: cleanText(normalizedAddress.fullName),
      phone: cleanText(normalizedAddress.phone),
      provinceId,
      districtId: undefined,
      wardCode: undefined,
      street: cleanText(normalizedAddress.street),
      isDefault,
    });
  };

  const handleCancelEditAddress = () => {
    setEditingAddressId(null);
    setAddressPrefillSource(null);
    setDistricts([]);
    setWards([]);
    addressForm.resetFields();
  };

  const handleSaveProfile = async (values: ProfileFormValues) => {
    setIsSavingProfile(true);
    try {
      const updatedProfile = await userProfileService.updateProfile({
        fullName: cleanText(values.fullName),
        email: cleanText(values.email).toLowerCase(),
        phone: cleanText(values.phone),
      });

      setProfile(updatedProfile);
      await refreshUser();
      messageApi.success("Đã cập nhật thông tin cá nhân");
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Cập nhật thông tin thất bại"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddAddress = async (values: AddressFormValues) => {
    if (!profile) {
      messageApi.warning("Thông tin tài khoản đang được tải, vui lòng thử lại");
      return;
    }

    const selectedProvince = provinces.find((item) => item.ProvinceID === values.provinceId);
    const selectedDistrict = districts.find((item) => item.DistrictID === values.districtId);
    const selectedWard = wards.find((item) => item.WardCode === values.wardCode);

    if (!selectedProvince || !selectedDistrict || !selectedWard) {
      messageApi.warning("Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện và Phường/Xã.");
      return;
    }

    setIsSavingAddress(true);
    try {
      const existing = profile.addresses.map(ensureAddressId);
      const nextAddressId = editingAddressId || `addr_${Date.now()}`;
      const nextAddress: UserAddress = {
        id: nextAddressId,
        label: cleanText(values.label) || undefined,
        fullName: cleanText(values.fullName),
        phone: cleanText(values.phone),
        province: {
          code: String(selectedProvince.ProvinceID),
          name: selectedProvince.ProvinceName,
        },
        district: {
          code: String(selectedDistrict.DistrictID),
          name: selectedDistrict.DistrictName,
        },
        ward: {
          code: selectedWard.WardCode,
          name: selectedWard.WardName,
        },
        street: cleanText(values.street),
      };

      const shouldSetDefault = Boolean(values.isDefault) || !currentDefaultAddressId;
      const nextDefaultAddressId = shouldSetDefault ? nextAddressId : currentDefaultAddressId;
      const upsertedAddresses = editingAddressId
        ? existing.map((item) => (item.id === editingAddressId ? nextAddress : item))
        : [...existing, nextAddress];
      const nextAddresses = upsertedAddresses.map((item) => ({
        ...item,
        isDefault: item.id === nextDefaultAddressId,
      }));

      const updatedProfile = await userProfileService.updateProfile({
        addresses: nextAddresses,
        defaultAddressId: nextDefaultAddressId,
      });

      setProfile(updatedProfile);
      addressForm.resetFields();
      setDistricts([]);
      setWards([]);
      setEditingAddressId(null);
      setAddressPrefillSource(null);
      messageApi.success(editingAddressId ? "Đã cập nhật địa chỉ" : "Đã thêm địa chỉ mới");
    } catch (error) {
      messageApi.error(
        getErrorMessage(error, editingAddressId ? "Cập nhật địa chỉ thất bại" : "Thêm địa chỉ thất bại"),
      );
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!profile) {
      return;
    }

    setIsSavingAddress(true);
    try {
      const nextAddresses = profile.addresses.map((item, index) => {
        const normalized = ensureAddressId(item, index);
        return {
          ...normalized,
          isDefault: normalized.id === addressId,
        };
      });

      const updatedProfile = await userProfileService.updateProfile({
        addresses: nextAddresses,
        defaultAddressId: addressId,
      });

      setProfile(updatedProfile);
      messageApi.success("Đã đặt địa chỉ mặc định");
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không đặt được địa chỉ mặc định"));
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleChangePassword = async (values: PasswordFormValues) => {
    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });

      passwordForm.resetFields();
      messageApi.success("Đã đổi mật khẩu thành công");
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Đổi mật khẩu thất bại"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendResetPassword = async () => {
    const email = cleanText(accountProfile.email);
    if (!email) {
      messageApi.warning("Tài khoản chưa có email hợp lệ");
      return;
    }

    setIsSendingReset(true);
    try {
      await authService.forgotPassword({ email });
      messageApi.success("Đã gửi hướng dẫn đặt lại mật khẩu qua email");
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không gửi được email đặt lại mật khẩu"));
    } finally {
      setIsSendingReset(false);
    }
  };

  const sortedAddresses = [...accountProfile.addresses].sort((a, b) => {
    const aIsDefault = a.id === currentDefaultAddressId || Boolean(a.isDefault);
    const bIsDefault = b.id === currentDefaultAddressId || Boolean(b.isDefault);
    if (aIsDefault === bIsDefault) {
      return 0;
    }
    return aIsDefault ? -1 : 1;
  });

  return (
    <StorePageShell>
      {contextHolder}

      <StoreHeroSection
        kicker="Tài khoản Rio"
        title={`Xin chào, ${accountProfile.fullName}`}
        description="Theo dõi đơn hàng, cập nhật thông tin cá nhân và quản lý địa chỉ giao hàng của bạn."
      >
        <div className="store-page-actions">
          <Link to="/orders">
            <Button type="primary" className={storeButtonClassNames.primary}>
              Đơn hàng của tôi
            </Button>
          </Link>
          <Link to="/wishlist">
            <Button className={storeButtonClassNames.secondary}>Sản phẩm yêu thích</Button>
          </Link>
          <Button className={storeButtonClassNames.danger} onClick={() => void logout()}>
            Đăng xuất
          </Button>
        </div>
      </StoreHeroSection>

      <StorePanelSection
        kicker="Thông tin tài khoản"
        title="Hồ sơ tài khoản"
        action={
          <StoreInlineNote
            title="Tài khoản đang hoạt động"
            description="Thông tin được đồng bộ cho giao hàng, thông báo và chăm sóc khách hàng."
          />
        }
      >
        {profileLoadError ? <Alert type="warning" message={profileLoadError} className="mb-4" /> : null}
        <StoreInfoGrid items={profileCards} />
      </StorePanelSection>

      <StorePanelSection
        kicker="Chỉnh sửa"
        title="Cập nhật thông tin cá nhân"
        description="Bạn có thể đổi tên, email và số điện thoại sử dụng trên toàn hệ thống."
      >
        <Form<ProfileFormValues>
          form={profileForm}
          layout="vertical"
          onFinish={handleSaveProfile}
          autoComplete="off"
          disabled={isProfileLoading}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item
              label="Họ tên"
              name="fullName"
              rules={[
                { required: true, message: "Vui lòng nhập họ tên" },
                { min: 2, message: "Họ tên tối thiểu 2 ký tự" },
              ]}
            >
              <Input size="large" placeholder="Nguyễn Văn A" />
            </Form.Item>

            <Form.Item
              label="Số điện thoại"
              name="phone"
              rules={[
                { required: true, message: "Vui lòng nhập số điện thoại" },
                { pattern: phonePattern, message: "Số điện thoại gồm 10-11 chữ số" },
              ]}
            >
              <Input size="large" placeholder="0987654321" />
            </Form.Item>
          </div>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không đúng định dạng" },
            ]}
          >
            <Input size="large" placeholder="you@example.com" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={isSavingProfile}
            className={storeButtonClassNames.primaryCompact}
          >
            Lưu thông tin
          </Button>
        </Form>
      </StorePanelSection>

      <StorePanelSection
        kicker="Địa chỉ"
        title="Địa chỉ giao hàng"
        description="Thêm địa chỉ để checkout nhanh hơn. Bạn có thể đặt một địa chỉ mặc định."
      >
        {sortedAddresses.length > 0 ? (
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {sortedAddresses.map((address) => {
              const isDefault = address.id === currentDefaultAddressId || Boolean(address.isDefault);
              const title = cleanText(address.label) || (isDefault ? "Địa chỉ mặc định" : "Địa chỉ giao hàng");

              return (
                <article key={address.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
                      <h3 className="m-0 mt-1 text-base font-bold text-slate-900">{address.fullName}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDefault ? (
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Mặc định</span>
                      ) : (
                        <Button
                          size="small"
                          className={storeButtonClassNames.secondaryCompact}
                          loading={isSavingAddress}
                          onClick={() => void handleSetDefaultAddress(address.id)}
                        >
                          Đặt mặc định
                        </Button>
                      )}
                      <Button
                        size="small"
                        className={storeButtonClassNames.secondaryCompact}
                        disabled={isSavingAddress}
                        onClick={() => handleStartEditAddress(address, isDefault)}
                      >
                        Sửa
                      </Button>
                    </div>
                  </div>
                  <p className="m-0 text-sm text-slate-700">{address.phone}</p>
                  <p className="m-0 mt-1 text-sm text-slate-600">{formatAddressSummary(address)}</p>
                </article>
              );
            })}
          </div>
        ) : (
          <StoreInlineNote
            title="Chưa có địa chỉ nào"
            description="Thêm địa chỉ đầu tiên để việc thanh toán nhanh gọn hơn."
          />
        )}

        <Form<AddressFormValues>
          form={addressForm}
          layout="vertical"
          onFinish={handleAddAddress}
          autoComplete="off"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item label="Nhãn địa chỉ" name="label">
              <Input size="large" placeholder="Nhà riêng, Văn phòng..." />
            </Form.Item>

            <Form.Item
              label="Người nhận"
              name="fullName"
              rules={[
                { required: true, message: "Vui lòng nhập tên người nhận" },
                { min: 2, message: "Tên người nhận tối thiểu 2 ký tự" },
              ]}
            >
              <Input size="large" placeholder="Nguyễn Văn A" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item
              label="Số điện thoại"
              name="phone"
              rules={[
                { required: true, message: "Vui lòng nhập số điện thoại" },
                { pattern: phonePattern, message: "Số điện thoại gồm 10-11 chữ số" },
              ]}
            >
              <Input size="large" placeholder="0987654321" />
            </Form.Item>

            <Form.Item
              label="Tỉnh / Thành"
              name="provinceId"
              rules={[{ required: true, message: "Vui lòng chọn tỉnh/thành" }]}
            >
              <Select
                size="large"
                showSearch
                placeholder="Chọn tỉnh/thành"
                loading={locationLoading && provinces.length === 0}
                options={provinces.map((item) => ({
                  value: item.ProvinceID,
                  label: item.ProvinceName,
                }))}
                optionFilterProp="label"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item
              label="Quận / Huyện"
              name="districtId"
              rules={[{ required: true, message: "Vui lòng chọn quận/huyện" }]}
            >
              <Select
                size="large"
                showSearch
                placeholder="Chọn quận/huyện"
                disabled={!selectedProvinceId}
                loading={locationLoading && selectedProvinceId !== undefined}
                options={districts.map((item) => ({
                  value: item.DistrictID,
                  label: item.DistrictName,
                }))}
                optionFilterProp="label"
              />
            </Form.Item>

            <Form.Item
              label="Phường / Xã"
              name="wardCode"
              rules={[{ required: true, message: "Vui lòng chọn phường/xã" }]}
            >
              <Select
                size="large"
                showSearch
                placeholder="Chọn phường/xã"
                disabled={!selectedDistrictId}
                loading={locationLoading && selectedDistrictId !== undefined}
                options={wards.map((item) => ({
                  value: item.WardCode,
                  label: item.WardName,
                }))}
                optionFilterProp="label"
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Số nhà, đường"
            name="street"
            rules={[{ required: true, message: "Vui lòng nhập địa chỉ cụ thể" }]}
          >
            <Input size="large" placeholder="Số 64, ngõ 68 Đường Phú Diễn" />
          </Form.Item>

          <Form.Item name="isDefault" valuePropName="checked" className="mb-4!">
            <Checkbox>Đặt làm địa chỉ mặc định</Checkbox>
          </Form.Item>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="primary"
              htmlType="submit"
              loading={isSavingAddress}
              className={storeButtonClassNames.primaryCompact}
            >
              {editingAddressId ? "Cập nhật địa chỉ" : "Thêm địa chỉ"}
            </Button>
            {editingAddressId ? (
              <Button
                className={storeButtonClassNames.secondaryCompact}
                disabled={isSavingAddress}
                onClick={handleCancelEditAddress}
              >
                Hủy sửa
              </Button>
            ) : null}
          </div>
        </Form>
      </StorePanelSection>

      <StorePanelSection
        kicker="Bảo mật"
        title="Mật khẩu và khôi phục"
        description="Bạn có thể đổi mật khẩu ngay tại đây, hoặc gửi link đặt lại qua email."
      >
        <Form<PasswordFormValues>
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          autoComplete="off"
        >
          <Form.Item
            label="Mật khẩu hiện tại"
            name="oldPassword"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại" }]}
          >
            <Input.Password size="large" placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item
              label="Mật khẩu mới"
              name="newPassword"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu mới" },
                { min: 6, message: "Mật khẩu mới tối thiểu 6 ký tự" },
              ]}
            >
              <Input.Password size="large" placeholder="Nhập mật khẩu mới" />
            </Form.Item>

            <Form.Item
              label="Xác nhận mật khẩu"
              name="confirmPassword"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Mật khẩu xác nhận không khớp"));
                  },
                }),
              ]}
            >
              <Input.Password size="large" placeholder="Nhập lại mật khẩu mới" />
            </Form.Item>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="primary"
              htmlType="submit"
              loading={isChangingPassword}
              className={storeButtonClassNames.primaryCompact}
            >
              Đổi mật khẩu
            </Button>
            <Button
              className={storeButtonClassNames.secondaryCompact}
              loading={isSendingReset}
              onClick={() => void handleSendResetPassword()}
            >
              Gửi link quên mật khẩu
            </Button>
          </div>
        </Form>
      </StorePanelSection>
    </StorePageShell>
  );
}
