import { Mail } from 'lucide-react';

const sampleVariables: Record<string, string> = {
  'user.name': 'Alex Morgan',
  'user.email': 'alex@example.com',
  'reset.url': 'https://panel.example.com/?resetToken=sample',
  'verify.url': 'https://panel.example.com/?verificationToken=sample',
  'login.ip': '203.0.113.24',
  'login.userAgent': 'Chrome on Windows',
  'actor.name': 'Jordan Admin',
  permission: 'operator',
  'server.name': 'Survival Realm',
  'server.id': 'srv_7M2Q',
  'server.status': 'running',
  'ticket.id': 'TKT-A1B2C3D4',
  'ticket.subject': 'Server will not start',
  'ticket.category': 'technical',
  'ticket.priority': 'high',
  'ticket.status': 'waiting on user',
  'ticket.excerpt': 'Please send the latest startup log so we can investigate.',
  'ticket.url': 'https://panel.example.com/?screen=tickets&ticket=TKT-A1B2C3D4',
  timestamp: new Date().toISOString()
};

export function renderTemplate(value: string, panelName: string) {
  return String(value || '').replace(/{{\s*([a-z0-9_.-]+)\s*}}/gi, (_match, key) => sampleVariables[key] || (key === 'panel.name' ? panelName : ''));
}

// The actual transactional email HTML shell used when emails are sent.
// ${title}, ${message}, ${resetAction}, ${brand}, and ${year} are filled in below.
function buildEmailHtml({
  title,
  message,
  resetAction,
  brand,
  year
}: {
  title: string;
  message: string;
  resetAction: string;
  brand: string;
  year: number;
}) {
  return `<!doctype html>
<html style="color-scheme:light dark">
  <head>
    <meta name="color-scheme" content="light dark"/>
    <meta name="supported-color-schemes" content="light dark"/>
    <style type="text/css" rel="stylesheet" media="all">
      :root { color-scheme: light dark; }
      .body { background-color: #ffffff; margin: 0; padding: 0; }
      .outer-table, .outer-td, .inner-td { background-color: #ffffff; }
      .block-row__cell { padding: 0 !important; }
      .block-row { padding: 0 !important; }
      p { color: #171717; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0; overflow-wrap: anywhere; }
      .break-all { color: #171717; font-size: 16px; line-height: 1.5; word-break: break-all; }
      h1 { color: #171717; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 24px 0; padding: 0; }
      h2 { color: #171717; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; }
      h3 { color: #171717; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; }
      a { color: #0067D6; text-decoration: none; }
      .block-markdown a { color: #0067D6; text-decoration: none; }
      a.block-button { color: inherit; }
      strong { color: #171717; font-weight: 600; }
      pre { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; color: #171717; background-color: #F2F2F2; border: 1px solid #E6E6E6; padding: 12px 16px; border-radius: 8px; font-size: 14px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
      code.inline { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; color: #171717; font-size: 0.9em; background-color: #F2F2F2; padding: 2px 6px; border-radius: 4px; }
      ul, ol { padding-left: 20px; margin: -8px 0 16px 0; }
      li { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif; font-size: 16px; line-height: 1.75; color: #171717; }
      .footer-text { color: #7D7D7D; font-size: 14px; line-height: 1.5; margin: 0 0 8px 0; }
      .footer-text a { color: #7D7D7D !important; text-decoration: underline !important; font-weight: 400 !important; }
      .footer-link { color: #7D7D7D !important; text-decoration: underline !important; font-weight: 400 !important; }
      .footer-hr { border-top-color: #E6E6E6; }
      .block-row.block-row--button_set-v1 { margin: 32px 0 !important; }
      .block-row.block-row--button_set-v1 .block-button { display: inline-block; box-sizing: border-box; text-decoration: none; -webkit-text-size-adjust: none; }
      .block-row.block-row--button_set-v1 .block-button.block-button--solid.block-button--sm { background-color: #000000; border-radius: 8px !important; color: #ffffff; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif; font-size: 16px; font-weight: 500; padding: 14px 20px; text-align: center; text-decoration: none; }
      .block-row.block-row--button_set-v1 .block-button.block-button--outline { border-style: solid; border-color: #E6E6E6; border-radius: 8px; color: #171717; font-size: 16px; font-weight: 500; padding: 14px 20px; }
      .block-row.block-row--divider-v1 .block-divider { border-bottom: 1px solid #E6E6E6; }
      .block-row.block-row--markdown-v1 .block-markdown > :first-child { margin-top: 0; }
      .block-row.block-row--markdown-v1 .block-markdown > :last-child { margin-bottom: 0; }

      @media (prefers-color-scheme: dark) {
        .body, .outer-table, .outer-td, .inner-td { background-color: #111111 !important; }
        p, .break-all, li, td { color: #ededed !important; }
        h1, h2, h3, strong { color: #ffffff !important; }
        a { color: #4da3ff !important; }
        td[bgcolor="#000000"], .email-cta { background-color: #EDEDED !important; }
        td[bgcolor="#000000"] a, .email-cta a { color: #0A0A0A !important; background-color: #EDEDED !important; }
        pre { color: #ededed !important; background-color: #282828 !important; border-color: #333333 !important; }
        code, code.inline { color: #ededed !important; background-color: #282828 !important; }
        .footer-text, .footer-text p { color: #7D7D7D !important; }
        .footer-text a { color: #7D7D7D !important; }
        .footer-link { color: #7D7D7D !important; }
        .footer-hr { border-top-color: #333333 !important; }
        .block-row.block-row--button_set-v1 .block-button.block-button--solid.block-button--sm { background-color: #EDEDED; color: #0A0A0A;}
        .block-row.block-row--button_set-v1 .block-button.block-button--outline { border-color: #333333 !important; color: #ededed !important; }
        .block-row.block-row--divider-v1 .block-divider { border-bottom-color: #333333 !important; }
        .block-button { background-color: #EDEDED !important; color: #0A0A0A !important; }
      }

      @media only screen and (max-width: 620px) {
        .outer-td { padding: 32px 16px !important; }
      }
    </style>
  </head>
  <body class="body" style="background-color:#ffffff;margin:0;padding:0">
    <table class="outer-table" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%!important;background-color:#ffffff">
      <tbody>
        <tr>
          <td class="outer-td" align="center" style="background-color:#ffffff;padding:32px 16px">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
              <tbody>
                <tr>
                  <td class="inner-td" style="background-color:#ffffff">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;text-align:left;max-width:600px;">

                      <table class="block-row block-row--markdown-v1" cellspacing="0" width="100%" cellpadding="0" style="padding:0 !important">
                        <tbody>
                          <tr class="block-row__row">
                            <td class="block-row__cell" style="padding:0 !important;padding-bottom:0px;padding-left:0px;padding-right:0px;padding-top:0px">
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tbody>
                                  <tr>
                                    <td class="block-markdown">
                                      <h1 style="color:#171717;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;font-size:24px;font-weight:600;letter-spacing:-0.02em;margin:0 0 24px 0;padding:0;margin-top:0">
                                        ${title}
                                      </h1>
                                      <p style="color:#171717;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;font-size:16px;line-height:1.5;margin:0 0 16px 0;overflow-wrap:anywhere">
                                        ${message}
                                      </p>
                                      ${resetAction}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <hr class="footer-hr" style="border-top-color:#E6E6E6;border:none;border-top:1px solid #E6E6E6;margin:44px 0 32px 0;width:100%"/>

                      <p class="footer-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;overflow-wrap:anywhere;color:#7D7D7D;font-size:14px;line-height:1.5;margin:0 0 8px 0">
                        This is an automated notification from ${brand}.
                      </p>
                      <p class="footer-text" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;overflow-wrap:anywhere;color:#7D7D7D;font-size:14px;line-height:1.5;margin:0 0 8px 0">
                        Copyright &copy; ${year} ${brand}. All rights reserved.
                      </p>

                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
}

export function EmailPreview({
  brand,
  fromName,
  fromAddress,
  templateKey,
  templateLabel,
  subject,
  body
}: {
  brand: string;
  fromName: string;
  fromAddress: string;
  templateKey: string;
  templateLabel: string;
  subject: string;
  body: string;
}) {
  const renderedSubject = renderTemplate(subject, brand);
  const renderedBody = renderTemplate(body, brand);
  const ticketTemplate = String(templateKey).startsWith('ticket');
  const actionLabel = ticketTemplate ? 'Open support ticket' : templateKey === 'emailVerification' ? 'Verify email' : 'Reset password';
  const showAction = ticketTemplate || templateKey === 'passwordReset' || templateKey === 'emailVerification';
  const actionUrl = ticketTemplate ? sampleVariables['ticket.url'] : templateKey === 'emailVerification' ? sampleVariables['verify.url'] : sampleVariables['reset.url'];

  const messageHtml = renderedBody
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="color:#171717;font-size:16px;line-height:1.5;margin:0 0 16px 0;overflow-wrap:anywhere">${paragraph}</p>`)
    .join('');

  const resetAction = showAction
    ? `<table class="block-row block-row--button_set-v1" cellspacing="0" width="100%" cellpadding="0" style="margin:32px 0 !important">
        <tbody>
          <tr>
            <td>
              <a class="block-button block-button--solid block-button--sm" href="${actionUrl}" style="display:inline-block;background-color:#000000;border-radius:8px;color:#ffffff;font-size:16px;font-weight:500;padding:14px 20px;text-align:center;text-decoration:none">${actionLabel}</a>
            </td>
          </tr>
        </tbody>
      </table>`
    : '';

  const html = buildEmailHtml({
    title: renderedSubject || 'Email subject',
    message: messageHtml,
    resetAction,
    brand: brand || 'Agapornis',
    year: new Date().getUTCFullYear()
  });

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]/60 bg-[var(--background)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)]/60 bg-[var(--secondary)]/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Mail size={15} className="text-[var(--primary)]" />
          <span className="truncate text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">{templateLabel} preview</span>
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-[var(--muted-foreground)]">{fromAddress || 'from not set'}</span>
      </div>
        <iframe
          title={`${templateLabel} email preview`}
          srcDoc={html}
          sandbox=""
          className="mx-auto block h-[560px] w-full  rounded-[var(--radius)] border-0 bg-white shadow-sm ring-1 ring-black/5"
        />
    </div>
  );
}
