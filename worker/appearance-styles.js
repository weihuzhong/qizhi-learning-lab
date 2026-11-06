export const appearanceStyles=String.raw`<style id="qizhi-appearance">
:root{--bg:#f7f6f2;--surface:#fff;--surface-soft:#f3f3ef;--ink:#28352e;--ink-soft:#48554c;--muted:#5e6b62;--line:#dce1db;--line-subtle:#e9ece7;--accent:#286650;--accent-hover:#1c503e;--pale:#eaf2e9;--pale-border:#cedfce;--sidebar:#fcfdfb;--on-accent:#fff;--hero:#edf2e8;--hero-ink:#244d39;--warn-bg:#fff5e7;--warn-ink:#815018;--shadow-sm:0 2px 6px #172d2003;--shadow-md:0 12px 32px #172d2008;--shadow-lg:0 24px 80px #10231824;--radius-lg:16px;--radius-md:10px;color-scheme:light}
:root[data-palette="ocean"]{--accent:#2969a8;--accent-hover:#205789;--pale:#e9f2fb;--pale-border:#cbdff0;--hero:#eaf1f8;--hero-ink:#284e73;--ink:#283b50;--ink-soft:#52677a}
:root[data-palette="violet"]{--accent:#7254b6;--accent-hover:#60429f;--pale:#f0ecf9;--pale-border:#ddd3ef;--hero:#eeeaf6;--hero-ink:#554275;--ink:#3c3550;--ink-soft:#655b77}
:root[data-palette="amber"]{--accent:#97602b;--accent-hover:#7c4e20;--pale:#f7efe3;--pale-border:#e9d9c0;--hero:#f5eddf;--hero-ink:#71512f;--ink:#463b2e;--ink-soft:#736454;--bg:#faf8f3}
:root[data-mode="dark"]{color-scheme:dark;--bg:#141b19;--surface:#1c2622;--surface-soft:#25312b;--sidebar:#18211d;--ink:#e3ece5;--ink-soft:#becbc2;--muted:#a0b1a6;--line:#34433a;--line-subtle:#2c3931;--accent:#9bd0b1;--accent-hover:#b7e2c7;--on-accent:#183527;--pale:#2c4335;--pale-border:#405b48;--hero:#263b2f;--hero-ink:#d0e6d3;--warn-bg:#3a3022;--warn-ink:#f0cb8d;--shadow-md:0 12px 32px #0002;--shadow-lg:0 24px 80px #0007}
:root[data-mode="dark"][data-palette="ocean"]{--bg:#151b23;--surface:#1d2733;--surface-soft:#263343;--sidebar:#19212b;--ink:#e5edf5;--ink-soft:#becddb;--muted:#a4b5c7;--line:#354559;--line-subtle:#2e3c4c;--accent:#9fc9f3;--accent-hover:#b6d8fa;--on-accent:#203b58;--pale:#2a4058;--pale-border:#3e5976;--hero:#253c52;--hero-ink:#d2e5f7}
:root[data-mode="dark"][data-palette="violet"]{--bg:#1b1823;--surface:#252030;--surface-soft:#302a3d;--sidebar:#201c29;--ink:#eee9f7;--ink-soft:#cec5de;--muted:#b5a8c8;--line:#463b56;--line-subtle:#393144;--accent:#c9b2f2;--accent-hover:#ddcafa;--on-accent:#3e2c59;--pale:#433455;--pale-border:#5a466e;--hero:#392e49;--hero-ink:#e4d8f7}
:root[data-mode="dark"][data-palette="amber"]{--bg:#211c17;--surface:#2c251e;--surface-soft:#382f25;--sidebar:#261f19;--ink:#f2eadd;--ink-soft:#d6c7b1;--muted:#bcaa91;--line:#4a3e30;--line-subtle:#3e3429;--accent:#e4bc87;--accent-hover:#f1cfa1;--on-accent:#493117;--pale:#4a3825;--pale-border:#655035;--hero:#403324;--hero-ink:#eedfc6}
body{background:var(--bg);color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;letter-spacing:0;line-height:1.65}
::selection{background:var(--pale-border);color:var(--ink)}
.layout{grid-template-columns:240px minmax(0,1fr)}.content{max-width:1440px;margin:0 auto;padding:32px 40px}.sidebar{background:var(--sidebar);color:var(--ink-soft);padding:24px 16px 16px;border-right:1px solid var(--line);box-shadow:none;height:100dvh}.sidebar .brand{padding:0 8px 24px;border-bottom:1px solid var(--line);gap:12px}.sidebar .brand strong{color:var(--ink);font-size:20px;letter-spacing:.5px}.sidebar .brand small{color:var(--muted);font-size:10px;letter-spacing:.35px}.sidebar .brandmark{width:40px;height:40px;background:var(--accent);color:var(--on-accent);box-shadow:none;border-radius:12px;font-size:22px}.nav-caption{color:var(--muted);font-size:12px;letter-spacing:0;padding:20px 12px 8px}.sidebar .nav{color:var(--ink-soft);padding:8px 12px;margin:4px 0;font-size:14px;gap:12px;border:1px solid transparent;border-radius:8px;min-height:40px;transition:background-color .16s,border-color .16s,color .16s}.sidebar .nav:hover{background:var(--surface-soft);color:var(--ink)}.sidebar .nav.active{background:var(--pale);border-color:var(--pale-border);color:var(--accent);box-shadow:none;font-weight:600}.sidebar .nav .ui-icon{width:18px!important;height:18px!important}.nav-more{border-color:var(--line);margin-top:16px;padding-top:16px}.nav-more summary{font-size:13px;color:var(--muted)}.nav-help{background:var(--surface-soft);border:1px solid var(--line);border-radius:12px;margin:24px 2px 16px;padding:16px}.nav-help>span{display:none}.nav-help strong{color:var(--ink)}.nav-help p{color:var(--muted);font-size:12px}.nav-help button{background:var(--surface);color:var(--accent);border:1px solid var(--line);min-height:36px}.sidebar .sidefoot{border-color:var(--line);color:var(--muted);padding:16px 8px 0}.sidebar .sidefoot strong{color:var(--ink-soft);font-weight:600}.sidebar .sidefoot small{display:block;margin-top:5px;font-size:10px}.topbar{background:var(--bg);border-bottom:1px solid var(--line);height:64px;padding:0 40px;gap:12px;backdrop-filter:none}.topbar .crumb{color:var(--muted);font-size:13px}.topbar #crumb{color:var(--ink);font-weight:500}.top-actions{display:flex;align-items:center;gap:12px;min-width:0}.status{background:transparent;color:var(--muted);border:0;box-shadow:none;padding:4px 0;font-size:12px}.dot{box-shadow:none}.dot::after{display:none}.appearance-trigger{font-size:12px;white-space:nowrap;padding:8px 12px;min-height:36px!important}.appearance-trigger .ui-icon{width:16px!important;height:16px!important}
.btn{background:var(--surface);border:1px solid var(--line);color:var(--ink);box-shadow:none;border-radius:8px;min-height:40px;font-size:14px;line-height:1.5;padding:8px 16px;transition:background-color .16s,border-color .16s,color .16s}.btn:hover{background:var(--surface-soft);border-color:var(--pale-border);box-shadow:none;transform:none}.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent);box-shadow:none}.btn.primary:hover{background:var(--accent-hover);border-color:var(--accent-hover);box-shadow:none}.btn:disabled{transform:none}.input,input,textarea,select{background:var(--surface);border-color:var(--line);color:var(--ink);border-radius:9px;accent-color:var(--accent)}input::placeholder,textarea::placeholder{color:var(--muted);opacity:.85}input:focus,textarea:focus,select:focus{border-color:var(--accent);outline:2px solid var(--pale-border);box-shadow:none}button:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px}a{color:var(--accent)}h1,h2,h3,h4{color:var(--ink)}p{color:var(--muted)}.s2-label,.eyebrow,.kicker{color:var(--muted);font-size:12px;letter-spacing:0;text-transform:none}.s2-heading{margin-bottom:24px}.s2-heading h1{font-size:32px;letter-spacing:0;font-weight:600;margin:8px 0}.s2-heading p{color:var(--ink-soft);font-size:14px;max-width:72ch}.s2-grid{gap:16px}.s2-card,.panel,.prepform,.lessonpage,.templatecard,.phase,.revision,.cw-card,.cw-player,.cw-credit,.cw-links details,.searchresult,.s2-flow{background:var(--surface);border-color:var(--line);box-shadow:var(--shadow-sm);border-radius:14px}.s2-card{padding:24px}.s2-card h3{font-size:18px;font-weight:600}.s2-card p,.s2-card li,.s2-flow p,.s2-muted,.s2-message small,.s2-step,.s2-card label,.s2-flow label{color:var(--muted)}.s2-card .tag,.tag,.cw-tag,.pill,.s2-lead .pill{background:var(--pale);color:var(--accent);border-color:var(--pale-border)}.s2-table th{background:var(--surface-soft);color:var(--ink)}.s2-table td,.s2-table th,.s2-step,.s2-message,.s2-memory,.s2-file-row{border-color:var(--line)}.s2-empty,.s2-jobmini,.s2-profile-status,.phasecheck,.output,.bubble,.cw-empty{background:var(--surface-soft);color:var(--muted)}.s2-upload{background:var(--surface-soft);border-color:var(--pale-border)}.s2-warn,.s2-reminder,.notice,.reviewbadge{background:var(--warn-bg);color:var(--warn-ink);border-color:var(--pale-border)}.s2-reminder h3{color:var(--warn-ink)}.s2-ok,.s2-step.done{color:var(--accent)}.s2-error{color:#c76170}.s2-password-toggle{color:var(--accent)}.s2-password-toggle:hover{background:var(--pale)}.teacherhero,.cw-intro,.pm-hero,.studio2-banner{background:var(--hero);border:1px solid var(--pale-border);box-shadow:none;color:var(--hero-ink);border-radius:16px}.teacherhero h1,.teacherhero h2,.studio2-banner h2,.pm-hero h3,.cw-intro h2{color:var(--hero-ink)}.teacherhero p,.cw-intro p,.studio2-banner p{color:var(--ink-soft)}.teacherhero::after{display:none}.teacherhero{padding:28px 32px}.preptabs{background:var(--surface-soft);border-color:var(--line);padding:4px;gap:4px}.preptabs button{color:var(--ink-soft);min-height:40px;font-size:14px;transition:background-color .16s,color .16s}.preptabs button:hover{color:var(--ink)}.preptabs button.active{background:var(--surface);color:var(--accent);box-shadow:var(--shadow-sm);font-weight:600}.prepactions{background:var(--surface);border-color:var(--line)}.phase:hover{border-color:var(--pale-border)}.phasebody small,.lessonsection h3{color:var(--accent)}.slidethumbs button{background:var(--surface);border-color:var(--line);color:var(--muted)}.slidethumbs button.active{background:var(--pale);color:var(--accent);border-color:var(--accent);box-shadow:none}.pm-hero .pm-steps>div,.pm-steps li{background:var(--surface);border-color:var(--line)}.pm-steps b{color:var(--accent)}.pm-steps span{color:var(--muted)}.stagebar{color:var(--muted);background:var(--surface-soft);border-color:var(--line)}.stagebar .done{color:var(--accent)}.cw-cardbody p,.cw-license,.cw-credit,.cw-links p,.cw-cardbody .cw-license{color:var(--muted)}.cw-credit strong{color:var(--ink)}.cw-cover,.cw-stage,.cw-thumb,.pm-online-preview{background:var(--surface-soft);border-color:var(--line)}.cw-tag.green{background:var(--pale);color:var(--accent)}.cw-thumb{color:var(--muted)}.cw-thumb[aria-current="true"]{background:var(--pale);color:var(--accent);border-color:var(--accent)}.cw-card{transition:border-color .16s}.cw-card:hover{transform:none;border-color:var(--pale-border);box-shadow:var(--shadow-sm)}.teachdialog{background:var(--surface);color:var(--ink)}.menu-toggle{background:var(--surface);color:var(--ink);border-color:var(--line)}
.prepform .input{background:var(--surface);color:var(--ink);border-color:var(--line)}.prepform>.hint,.work-heading p,.extra-conditions summary,.extra-conditions summary small{color:var(--muted)}.extra-conditions{border-color:var(--line)}.stagebar i{background:var(--line)}.empty-studio{background:var(--surface);border-color:var(--line)}.empty-icon{background:var(--pale);color:var(--accent);box-shadow:8px 8px 0 var(--surface-soft)}.empty-studio p,.empty-deliverables{color:var(--muted)}.next-action,.dialogue-intro,.generation-banner{background:var(--pale)}.next-action strong,.generation-banner strong{color:var(--accent)}.next-action small,.dialogue-intro p,.generation-banner small{color:var(--muted)}.loading-ring{border-color:var(--pale-border);border-top-color:var(--accent)}.lessonsection h3,.phasecheck{border-color:var(--pale-border)}.prepactions .btn.small{color:var(--muted)}
/* Keep the existing sequence of setup, generation and review. */
.pm-hero.s2-card{background:var(--surface)!important;border-color:var(--line)}
.pm-hero.s2-card h3{margin:0 0 8px;color:var(--ink);font-size:22px!important;font-weight:600}
.pm-hero.s2-card>p{margin:0;color:var(--ink-soft);font-size:14px}
.pm-hero .pm-steps{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:16px}
.pm-hero .pm-steps>div{gap:4px;padding:12px;background:var(--surface-soft);border-color:var(--line);border-radius:8px}
.pm-steps b{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.pm-steps strong{font-size:14px;font-weight:600}
.pm-steps span{font-size:13px;line-height:1.5}
.pm-online-result{margin-top:16px}
.pm-online-result .s2-muted{font-size:13px}
.pm-online-result .slidethumbs button{font-size:13px;line-height:1.55}
.pm-online-settings label{display:block;margin:12px 0 4px;font-size:14px;color:var(--ink-soft)}
@media(max-width:700px){.pm-hero .pm-steps{grid-template-columns:1fr}}
/* The homepage brings a real lesson excerpt onto the existing desk photograph. */
.desk-heading{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin:0 0 16px}
.desk-heading h1{margin:0;font-size:30px;font-weight:600;line-height:1.3;letter-spacing:0}
.desk-date{color:var(--muted);font-size:13px;white-space:nowrap}
.desk-hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.desk-hero-copy{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:40px}
.desk-hero h2{max-width:13em;margin:0 0 12px;color:var(--ink);font-size:clamp(28px,3vw,44px);line-height:1.32;letter-spacing:-.015em;font-weight:600}
.desk-hero-copy>p{max-width:30em;margin:0 0 24px;color:var(--ink-soft);font-size:16px;line-height:1.7}
.desk-hero .row{gap:8px}
.desk-hero .btn{min-height:44px}
.desk-hero-copy>small{display:block;margin-top:16px;color:var(--muted);font-size:12px;line-height:1.6}
.desk-art{display:grid;place-items:center;padding:24px;background:#eae0cf url('/media/classroom-cover.jpg') right center/cover}
.desk-art-note{width:min(100%,320px);padding:20px;color:#28352e;background:#fffcf6;border:1px solid #ded8cc;border-radius:12px;box-shadow:0 8px 24px #29241b18}
.desk-art-note>span{color:#4f6256;font-size:12px}
.desk-art-note h3{margin:4px 0;color:#28352e;font-family:"Noto Serif SC","Songti SC",SimSun,serif;font-size:22px;font-weight:600;line-height:1.45}
.desk-art-note>p{margin:0 0 12px;color:#4f6256;font-size:13px}
.desk-art-note ol{list-style:none;margin:0;padding:0;font-size:13px;line-height:1.6}
.desk-art-note li{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid #e3ddd2}
.desk-art-note li span:last-child{color:#4f6256;white-space:nowrap;font-variant-numeric:tabular-nums}
.desk-art-note li:last-child{padding-bottom:0}
[data-mode="dark"] .desk-art{background-image:linear-gradient(#141b1966,#141b1966),url('/media/classroom-cover.jpg')}
[data-mode="dark"] .desk-art-note{background:var(--surface);color:var(--ink);border-color:var(--line);box-shadow:none}
[data-mode="dark"] .desk-art-note h3{color:var(--ink)}
[data-mode="dark"] .desk-art-note>p,[data-mode="dark"] .desk-art-note>span,[data-mode="dark"] .desk-art-note li span:last-child{color:var(--muted)}
[data-mode="dark"] .desk-art-note li{border-color:var(--line)}
.desk-section-title{margin:24px 0 12px}
.desk-section-title h2{margin:0;font-size:18px;font-weight:600}
.desk-start-grid,.desk-utilities{display:grid;gap:12px}
.desk-start-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.desk-utilities{grid-template-columns:repeat(4,minmax(0,1fr))}
.desk-start,.desk-utilities>button{display:flex;align-items:center;gap:12px;min-width:0;padding:16px;text-align:left;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:12px;transition:background-color .16s,border-color .16s}
.desk-start:hover,.desk-utilities>button:hover{background:var(--surface-soft);border-color:var(--pale-border)}
.desk-start .desk-entry-text,.desk-utilities>button>span:nth-child(2){flex:1;min-width:0}
.desk-start strong,.desk-utilities strong{display:block;margin:0 0 4px;font-size:14px;font-weight:600;line-height:1.5}
.desk-entry-description,.desk-utilities small{display:block;color:var(--muted);font-size:12px;line-height:1.55}
.desk-tool-icon,.desk-utility-icon{display:grid;place-items:center;flex-shrink:0;color:var(--ink-soft)}
.desk-start .ui-icon,.desk-utilities .ui-icon,.desk-resume .ui-icon,.desk-hero .ui-icon,.desk-footer .ui-icon{width:16px!important;height:16px!important;flex-shrink:0}
.desk-start>.ui-icon,.desk-utilities>button>.ui-icon{color:var(--muted)}
.desk-resume{display:flex;align-items:center;gap:12px;padding:16px;margin-top:16px;background:var(--surface);border:1px solid var(--line);border-radius:12px}
.desk-resume>div{flex:1;min-width:0}
.desk-resume small{font-size:12px;color:var(--muted)}
.desk-resume h3{margin:4px 0 0;font-size:16px;font-weight:600;overflow-wrap:anywhere}
.desk-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:24px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}
.desk-footer button{display:inline-flex;align-items:center;gap:8px;padding:4px 0;background:transparent;color:var(--accent);font:inherit}
.desk-footer button:hover{text-decoration:underline}

/* Appearance dialog: native focus trapping, keyboard and Escape support. */
.appearance-dialog{width:min(540px,calc(100% - 32px));max-height:90dvh;overflow:auto;padding:24px;border:1px solid var(--line);border-radius:16px;background:var(--surface);color:var(--ink);box-shadow:var(--shadow-lg)}.appearance-dialog::backdrop{background:#141c1866}.appearance-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.appearance-head h2{font-size:22px;font-weight:600;line-height:1.4;margin:0}.appearance-close{font-size:22px;width:34px;min-height:34px;padding:0;flex-shrink:0}.appearance-dialog>p{font-size:12px;color:var(--muted)}.appearance-dialog fieldset{border:0;padding:0;margin:24px 0}.appearance-dialog legend{font-size:12px;font-weight:650;margin-bottom:12px}.palette-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.palette-choice{background:var(--surface);border:2px solid var(--line);border-radius:10px;padding:5px;color:var(--ink);text-align:left}.palette-choice[aria-pressed="true"]{border-color:var(--accent);background:var(--pale)}.palette-preview{display:flex;gap:6px;height:62px;background:#f6f7f5;border-radius:5px;padding:7px;overflow:hidden}.palette-preview>i{background:var(--sample);width:16px;border-radius:3px;opacity:.9}.palette-preview>span{flex:1;display:flex;flex-direction:column;gap:5px}.palette-preview b{height:10px;background:var(--sample);opacity:.17;border-radius:2px}.palette-preview b:first-child{height:21px;opacity:.4}.palette-choice>span:last-child{display:flex;justify-content:space-between;font-size:12px;padding:6px 3px 1px}.palette-check{opacity:0;color:var(--accent)}[aria-pressed="true"] .palette-check{opacity:1}.mode-options{display:flex;gap:5px;background:var(--surface-soft);border:1px solid var(--line);padding:5px;border-radius:10px}.mode-options button{flex:1;padding:10px 3px;border-radius:6px;background:transparent;color:var(--muted);font-size:12px}.mode-options button[aria-pressed="true"]{background:var(--surface);color:var(--accent);box-shadow:var(--shadow-sm);font-weight:650}.appearance-note{background:var(--surface-soft);padding:13px;border-radius:9px;color:var(--muted);font-size:11px}.appearance-dialog button:hover{border-color:var(--accent)}
@media(min-width:1500px){.content{padding:40px 48px}.desk-hero-copy{padding:48px}}
@media(max-width:1180px){
 .layout{grid-template-columns:216px minmax(0,1fr)}.content{padding:28px}.topbar{padding:0 28px}
 .sidebar{padding-left:12px;padding-right:12px}.desk-hero-copy{padding:28px}.desk-art{padding:16px}
 .desk-utilities{grid-template-columns:repeat(2,minmax(0,1fr))}
 .top-actions .status{max-width:190px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
}
@media(max-width:900px){
 .desk-hero{grid-template-columns:1fr}.desk-art{display:none}
 .desk-start-grid{gap:8px}.desk-start{padding:12px}.appearance-trigger>span{display:none}
}
@media(max-width:768px){
 .layout{display:block}.sidebar{position:relative;height:auto;width:100%;padding:16px 20px;border-right:0;border-bottom:1px solid var(--line)}
 .sidebar .brand{padding:0;border:0}.sidebar .brandmark{width:36px;height:36px;font-size:19px}.sidebar .brand strong{font-size:18px}
 .menu-toggle{right:20px;top:16px;min-height:36px;padding:4px 12px;background:var(--surface);color:var(--ink);border:1px solid var(--line)}
 .nav-open .sidebar nav{padding-bottom:12px}.sidebar .nav{min-height:44px}
 .topbar{height:56px;padding:0 20px;position:sticky;gap:8px}.topbar .crumb{font-size:12px}
 .top-actions{gap:8px}.top-actions .status{max-width:136px;font-size:11px}.appearance-trigger{padding:8px}
 .content{padding:24px 20px}.desk-heading h1{font-size:26px}.desk-date{display:none}
 .desk-hero-copy{padding:24px}.desk-hero h2{font-size:28px}.desk-hero-copy>p{font-size:14px}
 .desk-start-grid{grid-template-columns:1fr}.desk-start,.desk-utilities>button{padding:12px}
 .desk-utilities>button>.ui-icon{display:none}.desk-resume{flex-wrap:wrap}.desk-resume>.btn{margin-left:auto}
 .preplayout{grid-template-columns:minmax(0,1fr)}.preplayout>section,.lesson-workspace{min-width:0}
 .preptabs{flex-wrap:wrap;overflow:visible}.preptabs button{flex:0 1 auto}
 .desk-footer{flex-wrap:wrap}.s2-heading h1{font-size:26px}.s2-card{padding:20px}
 .appearance-dialog{padding:20px}.appearance-head h2{font-size:20px}.palette-grid{gap:8px}.palette-preview{height:52px;padding:4px;gap:4px}.palette-preview>i{width:12px}
}
@media(max-width:380px){
 .top-actions .status{display:none}.content{padding:20px 16px}.desk-hero-copy{padding:20px}.desk-hero h2{font-size:26px}
 .desk-utilities{grid-template-columns:1fr}
}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.btn:hover,.cw-card:hover,.desk-start:hover{transform:none}}
@media print{.topbar,.appearance-dialog,.desk-footer{display:none!important}:root{--bg:#fff;--surface:#fff;--surface-soft:#f5f5f5;--ink:#111;--ink-soft:#333;--muted:#444;--line:#ccc;--accent:#245d45;--pale:#f4f6f4;color-scheme:light}.content{padding:0}}
</style>`;
