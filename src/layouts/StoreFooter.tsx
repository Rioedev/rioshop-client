import {
  DownOutlined,
  EnvironmentOutlined,
  FacebookOutlined,
  InstagramOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
  TikTokOutlined,
  YoutubeOutlined,
} from "@ant-design/icons";

type StoreFooterProps = {
  footerSocialLinks: {
    facebook?: string;
    instagram?: string;
  };
};

export function StoreFooter({ footerSocialLinks }: StoreFooterProps) {
  return (
    <footer className="store-footer">
      <div className="mx-auto w-full max-w-405 px-3 py-10 sm:px-4 xl:px-6">
        <div className="store-footer-top">
          <div className="store-footer-intro">
            <h4>RIOSHOP XIN CHÀO 💖</h4>
            <p>
              Chúng tôi luôn quý trọng và tiếp thu mọi ý kiến đóng góp từ
              khách hàng, nhằm không ngừng cải thiện và nâng tầm trải nghiệm
              dịch vụ cùng chất lượng sản phẩm.
            </p>
            <form
              className="store-footer-subscribe"
              onSubmit={(event) => event.preventDefault()}
            >
              <input placeholder="Nhập địa chỉ email của bạn" />
              <button type="submit">Gửi</button>
            </form>
          </div>

          <div className="store-footer-contact">
            <div className="store-footer-contact-item">
              <PhoneOutlined />
              <div>
                <p>Hotline</p>
                <strong>1800 2086</strong>
                <span>Bấm phím 1 để được tư vấn mua hàng</span>
                <span>Bấm phím 2 để góp ý, khiếu nại</span>
              </div>
            </div>
            <div className="store-footer-contact-item">
              <MailOutlined />
              <div>
                <p>Email</p>
                <strong>chamsockhachhang@rioshop.vn</strong>
              </div>
            </div>
            <div className="store-footer-contact-item">
              <EnvironmentOutlined />
              <div>
                <p>Địa chỉ</p>
                <strong>
                  Đường An Định - Phường Việt Hòa - TP Hải Phòng
                </strong>
              </div>
            </div>
          </div>

          <div className="store-footer-social">
            <a href="#" aria-label="Zalo">
              Z
            </a>
            <a href="#" aria-label="Messenger">
              <MessageOutlined />
            </a>
            <a href="#" aria-label="TikTok">
              <TikTokOutlined />
            </a>
            <a href="#" aria-label="YouTube">
              <YoutubeOutlined />
            </a>
            <a
              href={footerSocialLinks.instagram || "#"}
              aria-label="Instagram"
              target={footerSocialLinks.instagram ? "_blank" : undefined}
              rel={
                footerSocialLinks.instagram ? "noreferrer noopener" : undefined
              }
              onClick={(event) => {
                if (!footerSocialLinks.instagram) {
                  event.preventDefault();
                }
              }}
            >
              <InstagramOutlined />
            </a>
            <a
              href={footerSocialLinks.facebook || "#"}
              aria-label="Facebook"
              target={footerSocialLinks.facebook ? "_blank" : undefined}
              rel={footerSocialLinks.facebook ? "noreferrer noopener" : undefined}
              onClick={(event) => {
                if (!footerSocialLinks.facebook) {
                  event.preventDefault();
                }
              }}
            >
              <FacebookOutlined />
            </a>
          </div>
        </div>

        <div className="store-footer-links">
          {[
            "HỆ THỐNG CỬA HÀNG",
            "MUA SẮM",
            "TIN TỨC",
            "DỊCH VỤ KHÁCH HÀNG",
            "VỀ RIOSHOP",
          ].map((item) => (
            <button
              key={item}
              type="button"
              className="store-footer-link-row"
            >
              <span>{item}</span>
              <DownOutlined />
            </button>
          ))}
        </div>

        <div className="store-footer-bottom">
          <div>
            <h5>@ CÔNG TY CỔ PHẦN THỜI TRANG RIOSHOP</h5>
            <p>
              Mã số doanh nghiệp: 0801206940. Giấy chứng nhận đăng ký doanh
              nghiệp do Sở Kế hoạch và Đầu tư TP Hải Dương cấp lần đầu ngày
              04/03/2017
            </p>
          </div>
          <div className="store-footer-certs">
            <span>DMCA PROTECTED</span>
            <span>ĐÃ THÔNG BÁO BỘ CÔNG THƯƠNG</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

