export interface ICategoryImage {
  url: string;
  public_id: string;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  parentId?: string | ICategory | null;
  description?: string;
  image?: ICategoryImage;
  sortOrder: number;
  status: "active" | "inactive";
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // when returned as tree, children may be attached
  children?: ICategory[];
}
