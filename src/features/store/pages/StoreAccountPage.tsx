import { Button, Card, Typography } from "antd";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../../stores/authStore";

const { Paragraph, Title } = Typography;

export function StoreAccountPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (!isAuthenticated || !user) {
    return (
      <section className="cart-empty-state">
        <Title level={3} className="m-0! mb-2!">
          Ban chua dang nhap
        </Title>
        <Paragraph className="mb-4! text-slate-600!">
          Dang nhap de xem thong tin tai khoan va quan ly don hang.
        </Paragraph>
        <Link to="/login">
          <Button type="primary" className="rounded-full! bg-slate-900! px-6! shadow-none!">
            Dang nhap
          </Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <Card className="rounded-2xl!">
        <Title level={3} className="mt-0!">
          Tai khoan cua toi
        </Title>
        <div className="grid gap-2 text-sm text-slate-700">
          <p className="m-0">
            <strong>Ho ten:</strong> {user.fullName}
          </p>
          <p className="m-0">
            <strong>Email:</strong> {user.email}
          </p>
          <p className="m-0">
            <strong>So dien thoai:</strong> {user.phone || "Dang cap nhat"}
          </p>
          <p className="m-0">
            <strong>Loai tai khoan:</strong> {user.accountType}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/orders">
            <Button className="rounded-full!">Don hang cua toi</Button>
          </Link>
          <Link to="/wishlist">
            <Button className="rounded-full!">San pham yeu thich</Button>
          </Link>
          <Button danger className="rounded-full!" onClick={() => void logout()}>
            Dang xuat
          </Button>
        </div>
      </Card>
    </section>
  );
}

