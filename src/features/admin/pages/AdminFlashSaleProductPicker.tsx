import { Button, Checkbox, Input, InputNumber, Modal, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "../../../services/productService";
import { resolveStoreImageUrl, resolveStoreProductThumbnail } from "../../store/utils/storeFormatting";

const { Text } = Typography;

type AdminFlashSaleProductPickerProps = {
  open: boolean;
  onClose: () => void;
  products: Product[];
  excludedProductIds: Set<string>;
  onConfirm: (productIds: string[], defaultDiscountPercent: number) => void;
};

export function AdminFlashSaleProductPicker({
  open,
  onClose,
  products,
  excludedProductIds,
  onConfirm,
}: AdminFlashSaleProductPickerProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [defaultDiscount, setDefaultDiscount] = useState(30);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearch("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return products
      .filter((p) => !excludedProductIds.has(p._id))
      .filter((p) => {
        if (!term) return true;
        const name = p.name?.toLowerCase() || "";
        const sku = p.sku?.toLowerCase() || "";
        return name.includes(term) || sku.includes(term);
      });
  }, [products, search, excludedProductIds]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p._id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p._id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.add(p._id));
        return next;
      });
    }
  };

  const handleConfirm = () => {
    if (selected.size === 0) return;
    onConfirm(Array.from(selected), defaultDiscount);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Chọn sản phẩm cho flash sale"
      width={920}
      destroyOnHidden
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Text type="secondary">% giảm mặc định:</Text>
            <InputNumber
              min={0}
              max={99}
              value={defaultDiscount}
              onChange={(value) => setDefaultDiscount(Number(value) || 0)}
              addonAfter="%"
              style={{ width: 110 }}
            />
            <Text type="secondary" className="text-xs!">
              (giá sale = giá gốc × (1 - %), làm tròn 1.000đ)
            </Text>
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose}>Hủy</Button>
            <Button type="primary" disabled={selected.size === 0} onClick={handleConfirm}>
              Thêm {selected.size > 0 ? `${selected.size} sản phẩm` : "sản phẩm"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input.Search
            placeholder="Tìm theo tên sản phẩm hoặc SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            className="flex-1 min-w-[260px]"
          />
          <Button onClick={toggleAll} disabled={filtered.length === 0}>
            {allFilteredSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </Button>
        </div>

        <div className="text-xs text-slate-500">
          {filtered.length} sản phẩm hiển thị · {selected.size} đã chọn
          {excludedProductIds.size > 0 ? ` · ${excludedProductIds.size} đã có trong flash sale` : ""}
        </div>

        <div className="max-h-[480px] overflow-y-auto rounded-md border border-slate-200 bg-white">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              {search ? "Không tìm thấy sản phẩm phù hợp." : "Tất cả sản phẩm đã được thêm vào flash sale."}
            </div>
          ) : (
            filtered.map((product) => {
              const isSelected = selected.has(product._id);
              const image =
                resolveStoreImageUrl(resolveStoreProductThumbnail(product)) ??
                "/placeholder-product.svg";
              const regularPrice = Number(product.pricing?.regularPrice ?? product.pricing?.salePrice ?? 0);

              return (
                <label
                  key={product._id}
                  className={`flex items-center gap-3 border-b border-slate-100 px-3 py-2 transition last:border-b-0 ${
                    isSelected ? "bg-[#eaf1fa]" : "hover:bg-slate-50"
                  } cursor-pointer`}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleSelect(product._id)}
                  />
                  <div className="h-14 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
                    <img src={image} alt={product.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-sm font-semibold text-slate-800">{product.name}</p>
                    <p className="m-0 text-xs text-slate-500">
                      SKU: {product.sku}
                      {product.category?.name ? ` · ${product.category.name}` : ""}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-[#082a5c]">
                    {regularPrice.toLocaleString("vi-VN")}đ
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
