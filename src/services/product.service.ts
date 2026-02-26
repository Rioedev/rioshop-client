import axiosInstance from "./axiosInstance";
import type { IProduct } from "../types/product.type";

export const getProducts = async (): Promise<IProduct[]> => {
  const { data } = await axiosInstance.get("/products");
  return data;
};