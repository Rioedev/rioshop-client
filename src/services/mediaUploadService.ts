import { apiClient } from "./apiClient";
import { type ApiResponse } from "./apiTypes";

export const DEFAULT_MAX_IMAGE_SIZE_MB = 5;

export const getImageValidationError = (
  file: Pick<File, "type" | "size">,
  maxSizeMb = DEFAULT_MAX_IMAGE_SIZE_MB,
) => {
  if (!file.type.startsWith("image/")) {
    return "Chỉ chấp nhận file ảnh";
  }

  if (file.size / 1024 / 1024 > maxSizeMb) {
    return `Kích thước ảnh phải nhỏ hơn ${maxSizeMb}MB`;
  }

  return null;
};

export const ensureImageFile = (
  file: Pick<File, "type" | "size">,
  maxSizeMb = DEFAULT_MAX_IMAGE_SIZE_MB,
) => {
  const validationError = getImageValidationError(file, maxSizeMb);
  if (validationError) {
    throw new Error(validationError);
  }
};

export const uploadImageToApi = async (endpoint: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<ApiResponse<{ url: string }>>(
    endpoint,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data.data.url;
};
