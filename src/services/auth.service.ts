import axiosInstance from "./axiosInstance";

export interface ILogin {
  email: string;
  password: string;
}

export interface IRegister extends ILogin {
  name: string;
}

export const login = async (data: ILogin) => {
  const res = await axiosInstance.post("/auth/login", data);
  return res.data;
};

export const register = async (data: IRegister) => {
  const res = await axiosInstance.post("/auth/register", data);
  return res.data;
};