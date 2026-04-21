import { AxiosError } from "axios";
import { repairMojibakeText } from "./mojibake";

type ErrorResponseShape = {
  message?: string;
  error?: string;
  data?: { message?: string };
};

const HTTP_STATUS_MESSAGE_MAP: Record<number, string> = {
  400: "Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại thông tin.",
  401: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu yêu cầu.",
  409: "Dữ liệu xung đột hoặc đã tồn tại. Vui lòng kiểm tra lại.",
  422: "Dữ liệu nhập chưa đúng định dạng.",
  429: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
  500: "Hệ thống đang bận. Vui lòng thử lại sau.",
  502: "Dịch vụ tạm thời gián đoạn. Vui lòng thử lại sau.",
  503: "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.",
  504: "Hệ thống phản hồi quá chậm. Vui lòng thử lại sau.",
};

const EXACT_MESSAGE_MAP: Record<string, string> = {
  "email or password incorrect": "Email hoặc mật khẩu không đúng.",
  "account is not active": "Tài khoản hiện chưa được kích hoạt.",
  "invalid token": "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
  "user not found": "Không tìm thấy tài khoản người dùng.",
  "current password is incorrect": "Mật khẩu hiện tại không đúng.",
  "reset token expired or invalid": "Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.",
  "invalid reset token": "Mã đặt lại mật khẩu không hợp lệ.",
  "email already in use": "Email này đã được sử dụng.",
  "phone already in use": "Số điện thoại này đã được sử dụng.",
  "admin email already exists": "Email quản trị đã tồn tại.",
  "admin not found": "Không tìm thấy tài khoản quản trị.",
  "cannot delete your own admin account": "Bạn không thể tự xóa tài khoản quản trị của mình.",
  "cart item not found": "Không tìm thấy sản phẩm trong giỏ hàng.",
  "item quantity is invalid": "Số lượng sản phẩm không hợp lệ.",
  "coupon code is required": "Vui lòng nhập mã giảm giá.",
  "cannot apply coupon to empty cart": "Không thể áp dụng mã giảm giá khi giỏ hàng trống.",
  "invalid cart item payload": "Dữ liệu sản phẩm trong giỏ hàng không hợp lệ.",
  "cart item id is required": "Thiếu mã định danh sản phẩm trong giỏ hàng.",
  "product not found": "Không tìm thấy sản phẩm.",
  "product is unavailable": "Sản phẩm hiện không khả dụng.",
  "variant not found or inactive": "Biến thể sản phẩm không tồn tại hoặc đã ngừng bán.",
  "brand config already exists": "Cấu hình thương hiệu đã tồn tại.",
  "coupon not found": "Không tìm thấy mã giảm giá.",
  "coupon date range is invalid": "Khoảng thời gian của mã giảm giá không hợp lệ.",
  "startsat must be before expiresat": "Thời gian bắt đầu phải trước thời gian kết thúc.",
  "coupon code already exists": "Mã giảm giá đã tồn tại.",
  "flash sale not found": "Không tìm thấy chương trình Flash Sale.",
  "flash sale is not active": "Chương trình Flash Sale hiện chưa hoạt động.",
  "flash sale slot not found": "Không tìm thấy khung giờ Flash Sale.",
  "quantity must be greater than zero": "Số lượng phải lớn hơn 0.",
  "flash sale stock limit exceeded": "Số lượng vượt quá giới hạn tồn kho Flash Sale.",
  "invalid flash sale date range": "Khoảng thời gian Flash Sale không hợp lệ.",
  "flash sale end date must be later than start date": "Thời gian kết thúc Flash Sale phải sau thời gian bắt đầu.",
  "inventory record not found": "Không tìm thấy dữ liệu tồn kho.",
  "variant sku does not belong to selected product": "Mã SKU biến thể không thuộc sản phẩm đã chọn.",
  "only single warehouse mode is allowed": "Hệ thống chỉ hỗ trợ một kho duy nhất.",
  "notification not found": "Không tìm thấy thông báo.",
  "order not found": "Không tìm thấy đơn hàng.",
  "order has already been paid": "Đơn hàng này đã được thanh toán.",
  "cannot initiate payment for this order status": "Không thể tạo thanh toán với trạng thái đơn hàng hiện tại.",
  "payment method is required": "Vui lòng chọn phương thức thanh toán.",
  "payment amount is invalid": "Số tiền thanh toán không hợp lệ.",
  "unsupported payment method": "Phương thức thanh toán chưa được hỗ trợ.",
  "payment not found for webhook payload": "Không tìm thấy giao dịch thanh toán tương ứng.",
  "payment not found": "Không tìm thấy giao dịch thanh toán.",
  "refund amount is invalid": "Số tiền hoàn không hợp lệ.",
  "order must contain at least one item": "Đơn hàng phải có ít nhất một sản phẩm.",
  "invalid order status": "Trạng thái đơn hàng không hợp lệ.",
  "failed to create order": "Không thể tạo đơn hàng. Vui lòng thử lại.",
  "failed to update order status": "Không thể cập nhật trạng thái đơn hàng.",
  "order can no longer be cancelled": "Đơn hàng này không thể hủy nữa.",
  "failed to cancel order": "Không thể hủy đơn hàng.",
  "only customer can submit return request": "Chỉ khách hàng mới có thể gửi yêu cầu đổi hàng.",
  "invalid return request type": "Loại yêu cầu đổi hàng không hợp lệ.",
  "only exchange request is supported": "Hệ thống hiện chỉ hỗ trợ yêu cầu đổi hàng.",
  "return request reason is required": "Vui lòng nhập lý do đổi hàng.",
  "return request is only allowed for delivered or completed orders":
    "Chỉ được gửi yêu cầu đổi hàng sau khi đơn đã giao thành công.",
  "a return request is already in progress": "Đơn hàng này đã có yêu cầu đổi hàng đang được xử lý.",
  "invalid return request status": "Trạng thái yêu cầu đổi hàng không hợp lệ.",
  "order does not have return request": "Đơn hàng này chưa có yêu cầu đổi hàng.",
  "only admin can update return request status": "Chỉ quản trị viên mới được cập nhật yêu cầu đổi hàng.",
  "return request can only be completed after order is marked returned":
    "Yêu cầu đổi hàng chỉ hoàn tất sau khi đơn được xử lý đúng quy trình.",
  "failed to update return request status": "Không thể cập nhật yêu cầu đổi hàng. Vui lòng thử lại.",
  "cannot determine delivered date for this order":
    "Không xác định được thời điểm giao hàng để kiểm tra hạn đổi hàng.",
  "return request period expired (3 day(s) after delivery)":
    "Đơn hàng đã quá hạn đổi hàng (3 ngày kể từ lúc giao thành công).",
  "invalid order item payload": "Dữ liệu sản phẩm trong đơn hàng không hợp lệ.",
  "inventory reserved underflow": "Dữ liệu giữ kho không hợp lệ.",
  "order not found for ghn shipment creation": "Không tìm thấy đơn hàng để tạo vận đơn GHN.",
  "cannot create ghn shipment: missing recipient name or phone":
    "Thiếu tên hoặc số điện thoại người nhận để tạo vận đơn GHN.",
  "ghn did not return tracking code for shipment": "GHN chưa trả về mã vận đơn.",
  "customer name is required for guest checkout":
    "Vui lòng nhập tên người nhận khi đặt hàng không cần đăng nhập.",
  "failed to generate order number": "Không thể tạo mã đơn hàng. Vui lòng thử lại.",
  "product sku could not be generated": "Không thể tạo SKU sản phẩm.",
  "sku already exists": "SKU đã tồn tại.",
  "review not found": "Không tìm thấy đánh giá.",
  "invalid review status": "Trạng thái đánh giá không hợp lệ.",
  "shipment not found": "Không tìm thấy vận đơn.",
  "tracking code is missing in webhook payload": "Thiếu mã vận đơn trong dữ liệu webhook.",
  "ghn is not configured. missing ghn_api_key or ghn_shop_id":
    "Hệ thống GHN chưa được cấu hình đầy đủ.",
  "ghn fee calculation requires todistrictid and towardcode":
    "Thiếu quận huyện hoặc phường xã để tính phí GHN.",
  "missing recipient district/ward for ghn shipment":
    "Thiếu quận huyện hoặc phường xã của người nhận để tạo vận đơn GHN.",
  "wishlist item not found": "Không tìm thấy sản phẩm yêu thích.",
  "invalid wishlist item payload": "Dữ liệu sản phẩm yêu thích không hợp lệ.",
  "wishlist item image is required": "Thiếu ảnh sản phẩm yêu thích.",
  "file image is required": "Vui lòng chọn ảnh để tải lên.",
  "only image files are allowed": "Chỉ chấp nhận file ảnh.",
  "something went wrong": "Đã xảy ra lỗi. Vui lòng thử lại.",
};

const PATTERN_MESSAGE_MAP: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /variant .* out of stock/, message: "Biến thể sản phẩm đã hết hàng." },
  { pattern: /variant .* not found/, message: "Không tìm thấy biến thể sản phẩm." },
  { pattern: /variant .* is inactive/, message: "Biến thể sản phẩm hiện không còn kinh doanh." },
  { pattern: /product .* not found/, message: "Không tìm thấy sản phẩm." },
  { pattern: /cannot change status from .*/, message: "Không thể chuyển trạng thái đơn hàng hiện tại." },
  {
    pattern: /return request period expired \(\d+ day\(s\) after delivery\)/,
    message: "Đơn hàng đã quá hạn đổi hàng theo chính sách hiện tại.",
  },
  {
    pattern: /cannot change return request status from .*/,
    message: "Không thể chuyển trạng thái yêu cầu đổi hàng theo hướng này.",
  },
  { pattern: /cloudinary .* failed/, message: "Tải ảnh lên thất bại. Vui lòng thử lại." },
  {
    pattern: /network error|failed to fetch|load failed/,
    message: "Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.",
  },
  { pattern: /^".+" is required$/, message: "Dữ liệu bắt buộc đang bị thiếu." },
  { pattern: /^".+" is not allowed to be empty$/, message: "Dữ liệu không được để trống." },
  { pattern: /^".+" must be a valid email$/, message: "Email không đúng định dạng." },
  { pattern: /^".+" must be one of /, message: "Giá trị dữ liệu không hợp lệ." },
  {
    pattern: /^".+" length must be at least \d+ characters long$/,
    message: "Dữ liệu quá ngắn so với quy định.",
  },
  {
    pattern: /^".+" length must be less than or equal to \d+ characters long$/,
    message: "Dữ liệu vượt quá độ dài cho phép.",
  },
  {
    pattern: /^".+" with value ".+" fails to match the required pattern/,
    message: "Dữ liệu nhập không đúng định dạng.",
  },
  { pattern: /request failed with status code 4\d\d/, message: "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại dữ liệu." },
  { pattern: /request failed with status code 5\d\d/, message: "Hệ thống đang bận. Vui lòng thử lại sau." },
  { pattern: /timeout|timed out|ecconnaborted/, message: "Hết thời gian chờ phản hồi. Vui lòng thử lại." },
];

const normalizeMessageKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const translateToVietnamese = (rawMessage?: string): string => {
  const normalizedMessage = repairMojibakeText(rawMessage, { trim: true });
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

export const getErrorMessage = (error: unknown, fallbackMessage = "Yêu cầu thất bại, vui lòng thử lại.") => {
  const fallback = translateToVietnamese(fallbackMessage) || "Yêu cầu thất bại, vui lòng thử lại.";

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