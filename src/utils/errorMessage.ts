import { AxiosError } from "axios";

export const getErrorMessage = (
  error: unknown,
  fallbackMessage = "Yêu cầu thất bại",
) => {
  if (error instanceof AxiosError) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};
