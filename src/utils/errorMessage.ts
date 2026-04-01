import { AxiosError } from "axios";

type ErrorResponseShape = {
  message?: string;
  error?: string;
  data?: { message?: string };
};

const HTTP_STATUS_MESSAGE_MAP: Record<number, string> = {
  400: "Du lieu gui len chua hop le. Vui long kiem tra lai thong tin.",
  401: "Phien dang nhap da het han hoac khong hop le. Vui long dang nhap lai.",
  403: "Ban khong co quyen thuc hien thao tac nay.",
  404: "Khong tim thay du lieu yeu cau.",
  409: "Du lieu xung dot hoac da ton tai. Vui long kiem tra lai.",
  422: "Du lieu nhap chua dung dinh dang.",
  429: "Ban thao tac qua nhanh. Vui long thu lai sau it phut.",
  500: "He thong dang ban. Vui long thu lai sau.",
  502: "Dich vu tam thoi gian doan. Vui long thu lai sau.",
  503: "Dich vu tam thoi khong kha dung. Vui long thu lai sau.",
  504: "He thong phan hoi qua cham. Vui long thu lai sau.",
};

const EXACT_MESSAGE_MAP: Record<string, string> = {
  "email or password incorrect": "Email hoac mat khau khong dung.",
  "account is not active": "Tai khoan hien chua duoc kich hoat.",
  "invalid token": "Phien dang nhap khong hop le. Vui long dang nhap lai.",
  "user not found": "Khong tim thay tai khoan nguoi dung.",
  "current password is incorrect": "Mat khau hien tai khong dung.",
  "reset token expired or invalid": "Lien ket dat lai mat khau da het han hoac khong hop le.",
  "invalid reset token": "Ma dat lai mat khau khong hop le.",
  "email already in use": "Email nay da duoc su dung.",
  "phone already in use": "So dien thoai nay da duoc su dung.",
  "admin email already exists": "Email quan tri da ton tai.",
  "admin not found": "Khong tim thay tai khoan quan tri.",
  "cannot delete your own admin account": "Ban khong the tu xoa tai khoan quan tri cua minh.",
  "cart item not found": "Khong tim thay san pham trong gio hang.",
  "item quantity is invalid": "So luong san pham khong hop le.",
  "coupon code is required": "Vui long nhap ma giam gia.",
  "cannot apply coupon to empty cart": "Khong the ap dung ma giam gia khi gio hang trong.",
  "invalid cart item payload": "Du lieu san pham trong gio hang khong hop le.",
  "cart item id is required": "Thieu ma dinh danh san pham trong gio hang.",
  "product not found": "Khong tim thay san pham.",
  "product is unavailable": "San pham hien khong kha dung.",
  "variant not found or inactive": "Bien the san pham khong ton tai hoac da ngung ban.",
  "brand config already exists": "Cau hinh thuong hieu da ton tai.",
  "coupon not found": "Khong tim thay ma giam gia.",
  "coupon date range is invalid": "Khoang thoi gian cua ma giam gia khong hop le.",
  "startsat must be before expiresat": "Thoi gian bat dau phai truoc thoi gian ket thuc.",
  "coupon code already exists": "Ma giam gia da ton tai.",
  "flash sale not found": "Khong tim thay chuong trinh Flash Sale.",
  "flash sale is not active": "Chuong trinh Flash Sale hien chua hoat dong.",
  "flash sale slot not found": "Khong tim thay khung gio Flash Sale.",
  "quantity must be greater than zero": "So luong phai lon hon 0.",
  "flash sale stock limit exceeded": "So luong vuot qua gioi han ton kho Flash Sale.",
  "invalid flash sale date range": "Khoang thoi gian Flash Sale khong hop le.",
  "flash sale end date must be later than start date": "Thoi gian ket thuc Flash Sale phai sau thoi gian bat dau.",
  "inventory record not found": "Khong tim thay du lieu ton kho.",
  "variant sku does not belong to selected product": "Ma SKU bien the khong thuoc san pham da chon.",
  "only single warehouse mode is allowed": "He thong chi ho tro mot kho duy nhat.",
  "notification not found": "Khong tim thay thong bao.",
  "order not found": "Khong tim thay don hang.",
  "order has already been paid": "Don hang nay da duoc thanh toan.",
  "cannot initiate payment for this order status": "Khong the tao thanh toan voi trang thai don hang hien tai.",
  "payment method is required": "Vui long chon phuong thuc thanh toan.",
  "payment amount is invalid": "So tien thanh toan khong hop le.",
  "unsupported payment method": "Phuong thuc thanh toan chua duoc ho tro.",
  "payment not found for webhook payload": "Khong tim thay giao dich thanh toan tuong ung.",
  "payment not found": "Khong tim thay giao dich thanh toan.",
  "refund amount is invalid": "So tien hoan khong hop le.",
  "order must contain at least one item": "Don hang phai co it nhat mot san pham.",
  "invalid order status": "Trang thai don hang khong hop le.",
  "failed to create order": "Khong the tao don hang. Vui long thu lai.",
  "failed to update order status": "Khong the cap nhat trang thai don hang.",
  "order can no longer be cancelled": "Don hang nay khong the huy nua.",
  "failed to cancel order": "Khong the huy don hang.",
  "invalid order item payload": "Du lieu san pham trong don hang khong hop le.",
  "inventory reserved underflow": "Du lieu giu kho khong hop le.",
  "order not found for ghn shipment creation": "Khong tim thay don hang de tao van don GHN.",
  "cannot create ghn shipment: missing recipient name or phone":
    "Thieu ten hoac so dien thoai nguoi nhan de tao van don GHN.",
  "ghn did not return tracking code for shipment": "GHN chua tra ve ma van don.",
  "customer name is required for guest checkout":
    "Vui long nhap ten nguoi nhan khi dat hang khong can dang nhap.",
  "failed to generate order number": "Khong the tao ma don hang. Vui long thu lai.",
  "product sku could not be generated": "Khong the tao SKU san pham.",
  "sku already exists": "SKU da ton tai.",
  "review not found": "Khong tim thay danh gia.",
  "invalid review status": "Trang thai danh gia khong hop le.",
  "shipment not found": "Khong tim thay van don.",
  "tracking code is missing in webhook payload": "Thieu ma van don trong du lieu webhook.",
  "ghn is not configured. missing ghn_api_key or ghn_shop_id":
    "He thong GHN chua duoc cau hinh day du.",
  "ghn fee calculation requires todistrictid and towardcode":
    "Thieu quan huyen hoac phuong xa de tinh phi GHN.",
  "missing recipient district/ward for ghn shipment":
    "Thieu quan huyen hoac phuong xa cua nguoi nhan de tao van don GHN.",
  "wishlist item not found": "Khong tim thay san pham yeu thich.",
  "invalid wishlist item payload": "Du lieu san pham yeu thich khong hop le.",
  "wishlist item image is required": "Thieu anh san pham yeu thich.",
  "something went wrong": "Da xay ra loi. Vui long thu lai.",
};

const PATTERN_MESSAGE_MAP: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /variant .* out of stock/, message: "Bien the san pham da het hang." },
  { pattern: /variant .* not found/, message: "Khong tim thay bien the san pham." },
  { pattern: /variant .* is inactive/, message: "Bien the san pham hien khong con kinh doanh." },
  { pattern: /product .* not found/, message: "Khong tim thay san pham." },
  { pattern: /cannot change status from .*/, message: "Khong the chuyen trang thai don hang hien tai." },
  { pattern: /cloudinary .* failed/, message: "Tai anh len that bai. Vui long thu lai." },
  {
    pattern: /network error|failed to fetch|load failed/,
    message: "Loi ket noi mang. Vui long kiem tra internet va thu lai.",
  },
  { pattern: /request failed with status code 4\d\d/, message: "Yeu cau khong hop le. Vui long kiem tra lai du lieu." },
  { pattern: /request failed with status code 5\d\d/, message: "He thong dang ban. Vui long thu lai sau." },
  { pattern: /timeout|timed out|ecconnaborted/, message: "Het thoi gian cho phan hoi. Vui long thu lai." },
];

const MOJIBAKE_PATTERN = /(Ã.|Â.|Ä.|Å.|Æ.|áº|á»|â€|â€œ|â€|â€“|â€”|â€¦)/;
const VIETNAMESE_CHAR_PATTERN =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g;

const normalizeMessageKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const countVietnameseChars = (value: string): number => (value.match(VIETNAMESE_CHAR_PATTERN) || []).length;

const repairMojibakeText = (value?: string): string => {
  const input = value?.toString() || "";
  if (!input || !MOJIBAKE_PATTERN.test(input)) {
    return input.trim();
  }

  try {
    const bytes = new Uint8Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
      bytes[index] = input.charCodeAt(index) & 0xff;
    }

    const decoded = new TextDecoder("utf-8").decode(bytes).trim();
    if (!decoded || decoded.includes("�")) {
      return input.trim();
    }

    return countVietnameseChars(decoded) >= countVietnameseChars(input) ? decoded : input.trim();
  } catch {
    return input.trim();
  }
};

const translateToVietnamese = (rawMessage?: string): string => {
  const normalizedMessage = repairMojibakeText(rawMessage);
  if (!normalizedMessage) {
    return "";
  }

  const messageKey = normalizeMessageKey(normalizedMessage);
  const exactMatch = EXACT_MESSAGE_MAP[messageKey];
  if (exactMatch) {
    return exactMatch;
  }

  const patternMatch = PATTERN_MESSAGE_MAP.find((entry) => entry.pattern.test(messageKey));
  if (patternMatch) {
    return patternMatch.message;
  }

  return normalizedMessage;
};

export const getErrorMessage = (error: unknown, fallbackMessage = "Yeu cau that bai, vui long thu lai.") => {
  const fallback = translateToVietnamese(fallbackMessage) || "Yeu cau that bai, vui long thu lai.";

  if (error instanceof AxiosError) {
    const responseData = (error.response?.data as ErrorResponseShape | undefined) ?? undefined;
    const statusCode = error.response?.status;

    const candidates = [
      responseData?.message,
      responseData?.error,
      responseData?.data?.message,
      error.message,
    ];

    for (const candidate of candidates) {
      const nextMessage = translateToVietnamese(candidate);
      if (nextMessage) {
        return nextMessage;
      }
    }

    if (statusCode && HTTP_STATUS_MESSAGE_MAP[statusCode]) {
      return HTTP_STATUS_MESSAGE_MAP[statusCode];
    }

    return fallback;
  }

  if (error instanceof Error) {
    const translated = translateToVietnamese(error.message);
    return translated || fallback;
  }

  return fallback;
};
