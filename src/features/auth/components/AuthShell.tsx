import { Typography } from "antd";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const { Paragraph, Title } = Typography;

type AuthShellProps = {
  title: string;
  subtitle: string;
  mode: "login" | "register";
  children: ReactNode;
};

export function AuthShell({ title, subtitle, mode, children }: AuthShellProps) {
  const isLogin = mode === "login";

  return (
    <div className="auth-page relative min-h-screen overflow-hidden bg-[#071a2f] px-4 py-8">
      <div className="auth-glow auth-glow-left" />
      <div className="auth-glow auth-glow-right" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="text-white">
          <div className="auth-kicker mb-6 inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs uppercase tracking-[0.16em]">
            RioShop
          </div>
          <h1 className="mb-4 max-w-xl text-4xl font-semibold leading-tight md:text-5xl">
            Mua sắm thông minh, chọn đồ chuẩn gu mỗi ngày.
          </h1>
          <p className="max-w-lg text-sm text-cyan-100/90 md:text-base">
            Đăng nhập để theo dõi đơn hàng, lưu sản phẩm yêu thích và nhận ưu đãi dành riêng cho
            thành viên RioShop.
          </p>
        </section>

        <section className="auth-card rounded-3xl border border-white/60 bg-white/85 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="mb-6">
            <Title level={3} className="!mb-1 !mt-0 !text-slate-900">
              {title}
            </Title>
            <Paragraph className="!mb-0 !text-slate-500">{subtitle}</Paragraph>
          </div>

          <div className="mb-5 rounded-xl bg-slate-100 p-1">
            <div className="grid grid-cols-2 gap-1">
              <Link
                to="/login"
                className={`rounded-lg px-4 py-2 text-center text-sm font-medium transition ${
                  isLogin
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className={`rounded-lg px-4 py-2 text-center text-sm font-medium transition ${
                  !isLogin
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Đăng ký
              </Link>
            </div>
          </div>

          {children}
        </section>
      </div>
    </div>
  );
}

