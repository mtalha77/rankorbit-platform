/**
 * Branded NAP Orbit HTML + plain-text email shells for Resend.
 * Colors mirror src/lib/theme.js (brand #5B5BD6, ink #171732).
 */

function appBaseUrl() {
  const raw = (process.env.APP_URL || "").replace(/\/$/, "");
  return raw || "https://nap.rankorbit.com";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Turn plain body into safe HTML paragraphs; bare URLs become links. */
function bodyToHtml(body) {
  const raw = String(body || "").trim();
  if (!raw) return "";
  const urlRe = /(https?:\/\/[^\s<]+)/g;
  return raw
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map((line) => {
        const parts = [];
        let last = 0;
        let m;
        urlRe.lastIndex = 0;
        while ((m = urlRe.exec(line))) {
          parts.push(escapeHtml(line.slice(last, m.index)));
          const url = m[1].replace(/[.,);]+$/, "");
          const safe = escapeHtml(url);
          parts.push(
            `<a href="${safe}" style="color:#5B5BD6;text-decoration:underline;">${safe}</a>`
          );
          last = m.index + m[0].length;
        }
        parts.push(escapeHtml(line.slice(last)));
        return parts.join("");
      });
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#5F6480;">${lines.join("<br/>")}</p>`;
    })
    .join("");
}

/**
 * @param {{ subject: string, body: string, ctaUrl?: string|null, ctaLabel?: string }} opts
 * @returns {{ html: string, text: string }}
 */
export function buildNotifyEmail({ subject, body, ctaUrl = null, ctaLabel = "Open dashboard" }) {
  const title = String(subject || "NAP Orbit notification").trim();
  const textBody = String(body || "").trim();
  const base = appBaseUrl();
  const cta = ctaUrl || null;
  const year = new Date().getFullYear();

  const textParts = [title, "", textBody];
  if (cta) {
    textParts.push("", `${ctaLabel}: ${cta}`);
  }
  textParts.push("", "— NAP Orbit", base);
  const text = textParts.filter((p, i, arr) => !(p === "" && arr[i - 1] === "")).join("\n");

  const ctaBlock = cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
        <tr>
          <td style="border-radius:12px;background:#5B5BD6;">
            <a href="${escapeHtml(cta)}"
               style="display:inline-block;padding:14px 28px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
              ${escapeHtml(ctaLabel)}
            </a>
          </td>
        </tr>
      </table>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F6F7FB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F7FB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E7E9F2;">
          <tr>
            <td style="background:linear-gradient(135deg,#5B5BD6 0%,#4646C4 55%,#8A4FD8 100%);padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:12px;background:rgba(255,255,255,0.2);text-align:center;vertical-align:middle;font-size:18px;line-height:36px;color:#ffffff;font-family:Sora,Inter,Helvetica,Arial,sans-serif;font-weight:800;">N</td>
                  <td style="padding-left:12px;font-family:Sora,Inter,Helvetica,Arial,sans-serif;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">NAP Orbit</td>
                </tr>
              </table>
              <p style="margin:10px 0 0;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,0.78);letter-spacing:0.4px;">Local visibility platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 12px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
              <h1 style="margin:0 0 16px;font-family:Sora,Inter,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.3;font-weight:800;color:#171732;letter-spacing:-0.4px;">
                ${escapeHtml(title)}
              </h1>
              ${bodyToHtml(textBody)}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9CA0B8;">
                You’re receiving this because you have a NAP Orbit account.
                <a href="${escapeHtml(base)}" style="color:#5B5BD6;text-decoration:none;font-weight:600;">nap.rankorbit.com</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;color:#9CA0B8;">
          © ${year} NAP Orbit · RankOrbit
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text };
}

export { appBaseUrl };
