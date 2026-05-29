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
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { policyService, type Policy } from "../services/policyService";

export type StoreFooterBrandLayout = {
  supportPhone?: string;
  supportEmail?: string;
  supportHotlineNote?: string;
  supportHotlineNoteSecondary?: string;
  storeAddress?: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    zalo?: string;
    messenger?: string;
  };
  footer: {
    introHeading?: string;
    intro?: string;
    companyName?: string;
    companyLegalText?: string;
    complianceBadges: string[];
    newsletterPlaceholder?: string;
  };
};

type StoreFooterProps = {
  brandLayout: StoreFooterBrandLayout;
};

type SocialIconProps = {
  href?: string;
  ariaLabel: string;
  children: ReactNode;
};

function SocialIcon({ href, ariaLabel, children }: SocialIconProps) {
  if (!href) return null;
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      target="_blank"
      rel="noreferrer noopener"
    >
      {children}
    </a>
  );
}

export function StoreFooter({ brandLayout }: StoreFooterProps) {
  const [policyPages, setPolicyPages] = useState<Policy[]>([]);

  useEffect(() => {
    let active = true;
    void policyService
      .listActiveByKind("page")
      .then((docs) => {
        if (active) setPolicyPages(docs);
      })
      .catch(() => {
        if (active) setPolicyPages([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const { socialLinks, footer } = brandLayout;
  const hasAnySocial =
    Boolean(socialLinks.zalo) ||
    Boolean(socialLinks.messenger) ||
    Boolean(socialLinks.tiktok) ||
    Boolean(socialLinks.youtube) ||
    Boolean(socialLinks.instagram) ||
    Boolean(socialLinks.facebook);

  return (
    <footer className="store-footer">
      <div className="mx-auto w-full max-w-440 px-3 py-10 sm:px-4 xl:px-6">
        <div className="store-footer-top">
          <div className="store-footer-intro">
            {footer.introHeading ? <h4>{footer.introHeading}</h4> : null}
            {footer.intro ? <p>{footer.intro}</p> : null}
            <form
              className="store-footer-subscribe"
              onSubmit={(event) => event.preventDefault()}
            >
              <input
                placeholder={
                  footer.newsletterPlaceholder || "Nhập địa chỉ email của bạn"
                }
              />
              <button type="submit">Gửi</button>
            </form>
          </div>

          <div className="store-footer-contact">
            {brandLayout.supportPhone ? (
              <div className="store-footer-contact-item">
                <PhoneOutlined />
                <div>
                  <p>Hotline</p>
                  <strong>{brandLayout.supportPhone}</strong>
                  {brandLayout.supportHotlineNote ? (
                    <span>{brandLayout.supportHotlineNote}</span>
                  ) : null}
                  {brandLayout.supportHotlineNoteSecondary ? (
                    <span>{brandLayout.supportHotlineNoteSecondary}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
            {brandLayout.supportEmail ? (
              <div className="store-footer-contact-item">
                <MailOutlined />
                <div>
                  <p>Email</p>
                  <strong>{brandLayout.supportEmail}</strong>
                </div>
              </div>
            ) : null}
            {brandLayout.storeAddress ? (
              <div className="store-footer-contact-item">
                <EnvironmentOutlined />
                <div>
                  <p>Địa chỉ</p>
                  <strong>{brandLayout.storeAddress}</strong>
                </div>
              </div>
            ) : null}
          </div>

          {hasAnySocial ? (
            <div className="store-footer-social">
              <SocialIcon href={socialLinks.zalo} ariaLabel="Zalo">Z</SocialIcon>
              <SocialIcon href={socialLinks.messenger} ariaLabel="Messenger">
                <MessageOutlined />
              </SocialIcon>
              <SocialIcon href={socialLinks.tiktok} ariaLabel="TikTok">
                <TikTokOutlined />
              </SocialIcon>
              <SocialIcon href={socialLinks.youtube} ariaLabel="YouTube">
                <YoutubeOutlined />
              </SocialIcon>
              <SocialIcon href={socialLinks.instagram} ariaLabel="Instagram">
                <InstagramOutlined />
              </SocialIcon>
              <SocialIcon href={socialLinks.facebook} ariaLabel="Facebook">
                <FacebookOutlined />
              </SocialIcon>
            </div>
          ) : null}
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

        {policyPages.length > 0 ? (
          <div className="store-footer-policies">
            <p className="store-footer-policies-label">Chính sách & quy định</p>
            <ul className="store-footer-policies-list">
              {policyPages.map((item) => (
                <li key={item._id}>
                  <Link to={`/chinh-sach/${item.slug}`}>{item.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {footer.companyName || footer.companyLegalText || footer.complianceBadges.length > 0 ? (
          <div className="store-footer-bottom">
            <div>
              {footer.companyName ? <h5>{footer.companyName}</h5> : null}
              {footer.companyLegalText ? <p>{footer.companyLegalText}</p> : null}
            </div>
            {footer.complianceBadges.length > 0 ? (
              <div className="store-footer-certs">
                {footer.complianceBadges.map((badge) => (
                  <span key={badge}>{badge}</span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
