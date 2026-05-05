module.exports.config = {
    name: "joinNoti",
    eventType: ["log:subscribe"],
    version: "3.2.0",
    credits: "SaGor",
    description: "Welcome card image - fully fixed: new user name, group name & group image",
    dependencies: {
        "fs-extra": "",
        "path": "",
        "moment-timezone": "",
        "axios": "",
        "canvas": ""
    }
};

module.exports.onLoad = function () {
    const { existsSync, mkdirSync } = global.nodemodule["fs-extra"];
    const { join } = global.nodemodule["path"];
    const basePath = join(__dirname, "cache", "joinNoti");
    if (!existsSync(basePath)) mkdirSync(basePath, { recursive: true });
};

async function downloadImage(url) {
    const axios = global.nodemodule["axios"] || require("axios");
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    return Buffer.from(res.data);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawCircleImg(ctx, img, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
}

function glowRing(ctx, cx, cy, r, c1, c2, lw) {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, c1); g.addColorStop(0.5, c2); g.addColorStop(1, c1);
    ctx.save();
    ctx.strokeStyle = g; ctx.lineWidth = lw;
    ctx.shadowColor = c2; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
}

function gText(ctx, text, x, y, color, glow, size, weight, align) {
    ctx.save();
    ctx.font = `${weight || "bold"} ${size}px Arial`;
    ctx.textAlign = align || "center";
    ctx.fillStyle = color;
    ctx.shadowColor = glow; ctx.shadowBlur = 16;
    ctx.fillText(text, x, y);
    ctx.restore();
}

function drawGemWithImage(ctx, cx, cy, R, groupImg) {
    const sides = 7;
    const pts = [];
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
        pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
    }

    function polyPath() {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < sides; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
    }

    ctx.save();
    polyPath();
    ctx.shadowColor = "rgba(140,60,255,0.9)";
    ctx.shadowBlur = 45;
    ctx.fillStyle = "rgba(140,60,255,0.01)";
    ctx.fill();
    ctx.restore();

    ctx.save();
    polyPath();
    const fg = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.05, cx, cy, R);
    fg.addColorStop(0.0, "rgba(215,165,255,0.97)");
    fg.addColorStop(0.2, "rgba(140,55,245,0.95)");
    fg.addColorStop(0.55, "rgba(72,12,175,0.97)");
    fg.addColorStop(1.0, "rgba(18,0,55,1)");
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.restore();

    if (groupImg) {
        ctx.save();
        polyPath();
        ctx.clip();
        ctx.globalAlpha = 0.88;
        ctx.drawImage(groupImg, cx - R * 0.9, cy - R * 0.9, R * 1.8, R * 1.8);
        ctx.restore();
    }

    ctx.save();
    polyPath(); ctx.clip();
    ctx.strokeStyle = "rgba(200,160,255,0.15)";
    ctx.lineWidth = 1;
    for (const [px, py] of pts) {
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    polyPath(); ctx.clip();
    const shine = ctx.createLinearGradient(cx - R * 0.5, cy - R * 0.65, cx + R * 0.1, cy - R * 0.05);
    shine.addColorStop(0, "rgba(255,255,255,0.30)");
    shine.addColorStop(0.6, "rgba(255,255,255,0.06)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shine; ctx.fill();
    ctx.restore();

    ctx.save();
    polyPath();
    const border = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    border.addColorStop(0, "rgba(235,195,255,0.85)");
    border.addColorStop(0.5, "rgba(185,125,255,0.65)");
    border.addColorStop(1, "rgba(125,65,205,0.55)");
    ctx.strokeStyle = border; ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(185,105,255,0.95)"; ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.restore();
}

function drawGemWithText(ctx, cx, cy, R, groupName) {
    const sides = 7;
    const pts = [];
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
        pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
    }

    function polyPath() {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < sides; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
    }

    ctx.save(); polyPath();
    ctx.shadowColor = "rgba(140,60,255,0.9)"; ctx.shadowBlur = 45;
    ctx.fillStyle = "rgba(140,60,255,0.01)"; ctx.fill(); ctx.restore();

    ctx.save(); polyPath();
    const fg = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.05, cx, cy, R);
    fg.addColorStop(0.0, "rgba(215,165,255,0.97)");
    fg.addColorStop(0.2, "rgba(140,55,245,0.95)");
    fg.addColorStop(0.55, "rgba(72,12,175,0.97)");
    fg.addColorStop(1.0, "rgba(18,0,55,1)");
    ctx.fillStyle = fg; ctx.fill(); ctx.restore();

    ctx.save(); polyPath(); ctx.clip();
    ctx.strokeStyle = "rgba(200,160,255,0.15)"; ctx.lineWidth = 1;
    for (const [px, py] of pts) {
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    }
    ctx.restore();

    ctx.save(); polyPath(); ctx.clip();
    const shine = ctx.createLinearGradient(cx - R * 0.5, cy - R * 0.65, cx + R * 0.1, cy - R * 0.05);
    shine.addColorStop(0, "rgba(255,255,255,0.30)");
    shine.addColorStop(0.6, "rgba(255,255,255,0.06)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shine; ctx.fill(); ctx.restore();

    ctx.save(); polyPath();
    const border = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    border.addColorStop(0, "rgba(235,195,255,0.85)");
    border.addColorStop(0.5, "rgba(185,125,255,0.65)");
    border.addColorStop(1, "rgba(125,65,205,0.55)");
    ctx.strokeStyle = border; ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(185,105,255,0.95)"; ctx.shadowBlur = 20;
    ctx.stroke(); ctx.restore();

    ctx.save(); polyPath(); ctx.clip();
    const maxW = R * 1.5;
    let fs = 26;
    ctx.font = `800 ${fs}px Arial`;
    while (ctx.measureText(groupName).width > maxW && fs > 11) {
        fs--; ctx.font = `800 ${fs}px Arial`;
    }
    const words = groupName.split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (ctx.measureText(test).width > maxW && cur) {
            lines.push(cur); cur = w;
        } else cur = test;
    }
    if (cur) lines.push(cur);
    const lh = fs + 8;
    const totalH = lines.length * lh;
    const startY = cy - totalH / 2 + lh * 0.82;
    lines.forEach((line, i) => {
        ctx.font = `800 ${fs}px Arial`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(230,190,255,0.75)";
        ctx.shadowBlur = 16;
        ctx.fillText(line, cx, startY + i * lh);
    });
    ctx.restore();
}

async function generateWelcomeCard({
    newUserID, adderID, adderName, memberNumber,
    newUserName, threadName, groupImageSrc
}) {
    const { createCanvas, loadImage } = require("canvas");
    const W = 1366, H = 768;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // 1. Background
    const bg = ctx.createRadialGradient(W * 0.2, H * 0.45, 60, W * 0.5, H * 0.5, W * 0.85);
    bg.addColorStop(0.0, "#1c0c42");
    bg.addColorStop(0.3, "#0e0c32");
    bg.addColorStop(0.65, "#07072a");
    bg.addColorStop(1.0, "#020212");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // 2. Circuit grid
    ctx.save();
    ctx.strokeStyle = "rgba(0,200,255,0.055)"; ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let x = 0; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.fillStyle = "rgba(0,200,255,0.15)";
    [[72,108],[180,216],[576,72],[756,180],[972,108],[1152,216],[1332,72],[360,576],[756,504],[1098,576]].forEach(([nx, ny]) => {
        ctx.beginPath(); ctx.arc(nx, ny, 2.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    // 3. Glow orbs
    [[240,-70,240,"rgba(90,0,230,0.14)"],[1150,310,210,"rgba(0,90,230,0.10)"],[330,610,170,"rgba(0,190,140,0.09)"]].forEach(([ox, oy, or_, oc]) => {
        const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, or_);
        og.addColorStop(0, oc); og.addColorStop(1, "transparent");
        ctx.fillStyle = og; ctx.fillRect(0, 0, W, H);
    });
    const tlg = ctx.createRadialGradient(0, 0, 0, 0, 0, 340);
    tlg.addColorStop(0, "rgba(80,0,180,0.18)"); tlg.addColorStop(1, "transparent");
    ctx.fillStyle = tlg; ctx.fillRect(0, 0, W, H);

    // 4. Stars
    [[302,78],[698,145],[964,58],[1168,298],[198,502],[498,398],[1052,178],[820,552],[430,200],[1200,450]].forEach(([sx, sy]) => {
        ctx.save(); ctx.globalAlpha = 0.4 + Math.random() * 0.5;
        ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(180,220,255,0.8)"; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(sx, sy, 1.2 + Math.random() * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    // 5. Card frame
    ctx.save();
    roundRect(ctx, 52, 50, W - 104, H - 100, 16);
    ctx.fillStyle = "rgba(4,8,48,0.72)";
    ctx.shadowColor = "rgba(0,100,255,0.22)"; ctx.shadowBlur = 45;
    ctx.fill();
    ctx.strokeStyle = "rgba(90,160,255,0.30)"; ctx.lineWidth = 1.5;
    ctx.stroke(); ctx.restore();

    // Top shimmer
    const tsl = ctx.createLinearGradient(W * 0.12, 51, W * 0.88, 51);
    tsl.addColorStop(0, "transparent"); tsl.addColorStop(0.5, "rgba(170,215,255,0.5)"); tsl.addColorStop(1, "transparent");
    ctx.save(); ctx.strokeStyle = tsl; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W * 0.12, 51); ctx.lineTo(W * 0.88, 51); ctx.stroke(); ctx.restore();

    // Corner brackets
    [[58,56,1,1],[W-58,56,-1,1],[58,H-50,-1,-1],[W-58,H-50,1,-1]].forEach(([bx, by, sx, sy]) => {
        const L = 28;
        ctx.save(); ctx.strokeStyle = "rgba(0,200,255,0.55)"; ctx.lineWidth = 2.2;
        ctx.shadowColor = "rgba(0,200,255,0.3)"; ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(bx + sx * L, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + sy * L);
        ctx.stroke(); ctx.restore();
    });

    // 6. "Welcome To" title
    ctx.save();
    const titleG = ctx.createLinearGradient(W / 2 - 280, 100, W / 2 + 280, 155);
    titleG.addColorStop(0, "#e8e0ff"); titleG.addColorStop(0.4, "#ffffff");
    titleG.addColorStop(0.7, "#d0e8ff"); titleG.addColorStop(1, "#e8e0ff");
    ctx.font = "900 66px Arial"; ctx.textAlign = "center";
    ctx.fillStyle = titleG;
    ctx.shadowColor = "rgba(140,200,255,0.55)"; ctx.shadowBlur = 22;
    ctx.fillText("Welcome To", W / 2, 148);
    ctx.restore();

    // 7. Load avatars
    const TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";
    let newUserImg = null, adderImg = null, groupImg = null;

    try {
        newUserImg = await loadImage(
            await downloadImage(`https://graph.facebook.com/${newUserID}/picture?width=720&height=720&access_token=${TOKEN}`)
        );
    } catch (_) {}

    try {
        adderImg = await loadImage(
            await downloadImage(`https://graph.facebook.com/${adderID}/picture?width=720&height=720&access_token=${TOKEN}`)
        );
    } catch (_) {}

    try {
        if (groupImageSrc) {
            groupImg = await loadImage(await downloadImage(groupImageSrc));
        }
    } catch (_) {}

    // ──────────────────────────────
    //  LEFT: New User
    // ──────────────────────────────
    const LX = 255, LY = 295, LR = 110;

    ctx.save(); ctx.strokeStyle = "rgba(0,255,120,0.20)"; ctx.lineWidth = 1.2; ctx.setLineDash([4, 8]);
    ctx.beginPath(); ctx.arc(LX, LY, LR + 28, 0, Math.PI * 2); ctx.stroke(); ctx.restore();

    glowRing(ctx, LX, LY, LR + 16, "#00ff88", "#00ddaa", 2.2);
    glowRing(ctx, LX, LY, LR + 7, "#00ff88", "#00ff88", 1.5);

    if (newUserImg) drawCircleImg(ctx, newUserImg, LX, LY, LR);
    else {
        ctx.save(); ctx.fillStyle = "#112244";
        ctx.beginPath(); ctx.arc(LX, LY, LR, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = "rgba(0,210,110,0.75)"; ctx.lineWidth = 3;
    ctx.shadowColor = "#00ff88"; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(LX, LY, LR, 0, Math.PI * 2); ctx.stroke(); ctx.restore();

    // NEW USER label
    gText(ctx, "NEW USER", LX, LY + LR + 38, "#00ff88", "rgba(0,255,100,0.6)", 28, "800");

    // ── New user name - FULL NAME, auto font shrink ──
    const displayName = (newUserName && newUserName.trim()) ? newUserName.trim() : "New Member";
    ctx.save();
    let fs2 = 38;
    ctx.font = `700 ${fs2}px Arial`;
    while (ctx.measureText(displayName).width > 420 && fs2 > 16) {
        fs2--;
        ctx.font = `700 ${fs2}px Arial`;
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,220,120,0.5)"; ctx.shadowBlur = 14;
    ctx.fillText(displayName, LX, LY + LR + 72);
    ctx.restore();

    // Hex data
    ctx.save(); ctx.font = "13px 'Courier New'"; ctx.fillStyle = "rgba(0,210,110,0.45)"; ctx.textAlign = "left";
    [
        "99 09 98 CD 99  99 99 99 98 CD 81 A8 CD B1",
        "8  3  0  0  0   0  1  0  5  0  0  8  5  0",
        `[ FB_ID: ${newUserID} ]`,
        "0  0  S  0  2   0  B  C  6  4  A",
        "4  5  8  2  0   1  1  0  1  8  8  0  0  B"
    ].forEach((l, i) => ctx.fillText(l, 80, 450 + i * 18));
    ctx.restore();

    // ──────────────────────────────
    //  ARROW: left → center gem
    // ──────────────────────────────
    const arSX = LX + LR + 22, arEX = W / 2 - 125, arY = LY;

    ctx.save(); ctx.setLineDash([5, 8]);
    ctx.strokeStyle = "rgba(100,200,255,0.26)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(arSX, arY);
    ctx.bezierCurveTo(arSX + 80, arY + 18, arEX - 80, arY - 18, arEX - 28, arY);
    ctx.stroke(); ctx.restore();

    const arG = ctx.createLinearGradient(arSX, 0, arEX, 0);
    arG.addColorStop(0, "rgba(0,160,255,0.08)");
    arG.addColorStop(0.65, "rgba(0,180,255,0.80)");
    arG.addColorStop(1, "rgba(160,220,255,0.95)");
    ctx.save(); ctx.setLineDash([]);
    ctx.strokeStyle = arG; ctx.lineWidth = 2.2;
    ctx.shadowColor = "rgba(0,180,255,0.5)"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(arSX, arY); ctx.lineTo(arEX - 24, arY); ctx.stroke();
    ctx.fillStyle = "rgba(160,220,255,0.95)";
    ctx.shadowColor = "rgba(0,180,255,0.8)"; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(arEX, arY); ctx.lineTo(arEX - 22, arY - 10); ctx.lineTo(arEX - 22, arY + 10);
    ctx.closePath(); ctx.fill(); ctx.restore();

    for (let d = 0; d < 7; d++) {
        const dx = arSX + (arEX - arSX) * (d / 7) + 8;
        ctx.save(); ctx.globalAlpha = d % 2 ? 0.7 : 0.3;
        ctx.fillStyle = "rgba(120,210,255,0.8)";
        ctx.beginPath(); ctx.arc(dx, arY, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    // ──────────────────────────────
    //  CENTER: Gem
    // ──────────────────────────────
    const GCX = W / 2, GCY = 310, GR = 112;

    if (groupImg) {
        drawGemWithImage(ctx, GCX, GCY, GR, groupImg);
    } else {
        drawGemWithText(ctx, GCX, GCY, GR, threadName);
    }

    // Group name label BELOW gem
    ctx.save();
    ctx.font = "700 22px Arial";
    let gName = (threadName && threadName.trim()) ? threadName.trim() : "Our Group";
    const gnMaxW = 360;
    while (ctx.measureText(gName).width > gnMaxW - 20 && gName.length > 3) {
        gName = gName.slice(0, -1);
    }
    if (gName !== threadName) gName += "…";

    const gnW = Math.min(ctx.measureText(gName).width + 48, gnMaxW);

    roundRect(ctx, GCX - gnW / 2, GCY + GR + 10, gnW, 38, 19);
    ctx.fillStyle = "rgba(100,30,220,0.75)";
    ctx.shadowColor = "rgba(140,60,255,0.6)"; ctx.shadowBlur = 18;
    ctx.fill();
    ctx.strokeStyle = "rgba(190,140,255,0.55)"; ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(210,180,255,0.7)"; ctx.shadowBlur = 12;
    ctx.fillText(gName, GCX, GCY + GR + 35);
    ctx.restore();

    // [COMMUNITY_KEY_STRING]
    ctx.save();
    ctx.font = "15px 'Courier New'"; ctx.textAlign = "center";
    ctx.fillStyle = "rgba(165,125,255,0.55)";
    ctx.fillText("[COMMUNITY_KEY_STRING]", GCX, GCY + GR + 66);
    ctx.restore();

    // ──────────────────────────────
    //  RIGHT: Added By
    // ──────────────────────────────
    const RX = 1112, RY = 282, RR = 102;

    ctx.save();
    roundRect(ctx, RX - RR - 30, RY - RR - 30, (RR + 30) * 2, (RR + 30) * 2 + 80, 14);
    ctx.fillStyle = "rgba(4,12,52,0.55)";
    ctx.strokeStyle = "rgba(75,145,255,0.28)"; ctx.lineWidth = 1.2;
    ctx.fill(); ctx.stroke(); ctx.restore();

    ctx.save(); ctx.strokeStyle = "rgba(0,150,255,0.18)"; ctx.lineWidth = 1.2; ctx.setLineDash([5, 9]);
    ctx.beginPath(); ctx.arc(RX, RY, RR + 24, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    glowRing(ctx, RX, RY, RR + 11, "#0099ff", "#00ccff", 2);

    if (adderImg) drawCircleImg(ctx, adderImg, RX, RY, RR);
    else {
        ctx.save(); ctx.fillStyle = "#0a1a44";
        ctx.beginPath(); ctx.arc(RX, RY, RR, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = "rgba(88,168,255,0.65)"; ctx.lineWidth = 3;
    ctx.shadowColor = "#0099ff"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(RX, RY, RR, 0, Math.PI * 2); ctx.stroke(); ctx.restore();

    // ADDED BY label
    gText(ctx, "ADDED BY", RX, RY + RR + 36, "rgba(108,182,255,0.85)", "rgba(0,140,255,0.4)", 22, "700");

    // ── Adder name - FULL NAME, auto font shrink ──
    ctx.save();
    let adName = adderName || "Unknown";
    let afs = 38;
    ctx.font = `800 ${afs}px Arial`;
    while (ctx.measureText(adName).width > 380 && afs > 16) {
        afs--;
        ctx.font = `800 ${afs}px Arial`;
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(108,178,255,0.45)"; ctx.shadowBlur = 16;
    ctx.fillText(adName, RX, RY + RR + 68);
    ctx.restore();

    // FAMILY FOREVER badge
    ctx.save(); ctx.strokeStyle = "rgba(188,162,88,0.35)"; ctx.lineWidth = 1.2; ctx.setLineDash([3, 5]);
    roundRect(ctx, RX - 120, RY + RR + 84, 240, 40, 20);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = "15px Arial"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(188,162,88,0.55)";
    ctx.fillText("✦  FAMILY FOREVER  ✦", RX, RY + RR + 109);
    ctx.restore();

    // Binary stream
    ctx.save(); ctx.font = "13px 'Courier New'"; ctx.fillStyle = "rgba(88,168,255,0.22)"; ctx.textAlign = "left";
    ctx.fillText("B1D 91D B1D 9B ✦ 91D 13 8S D9 FAA AB MAB LAB YAB EB 1AD SD SP CD FAB ORB EAB VCB EAB RCB AB B1D 12 0S AB B1D ...", 78, H - 95);
    ctx.restore();

    // Member bar
    const bW = 574, bH = 70, bX = (W - bW) / 2, bY = H - 158;
    ctx.save();
    roundRect(ctx, bX, bY, bW, bH, 35);
    const bG = ctx.createLinearGradient(bX, bY, bX + bW, bY);
    bG.addColorStop(0, "rgba(62,0,148,0.94)");
    bG.addColorStop(0.5, "rgba(105,18,225,0.98)");
    bG.addColorStop(1, "rgba(62,0,148,0.94)");
    ctx.fillStyle = bG;
    ctx.shadowColor = "rgba(110,0,240,0.6)"; ctx.shadowBlur = 38;
    ctx.fill();
    ctx.strokeStyle = "rgba(145,82,255,0.75)"; ctx.lineWidth = 2;
    ctx.stroke(); ctx.restore();

    ctx.save(); roundRect(ctx, bX, bY, bW, bH, 35); ctx.clip();
    const bs = ctx.createLinearGradient(bX, bY, bX, bY + bH);
    bs.addColorStop(0, "rgba(255,255,255,0.09)"); bs.addColorStop(0.5, "transparent");
    ctx.fillStyle = bs; ctx.fillRect(bX, bY, bW, bH); ctx.restore();

    [[bX + 26, bY + bH / 2], [bX + bW - 26, bY + bH / 2]].forEach(([gx, gy]) => {
        ctx.save(); ctx.fillStyle = "rgba(175,95,255,0.92)";
        ctx.shadowColor = "#c055ff"; ctx.shadowBlur = 12;
        const pts2 = [];
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; pts2.push([gx + Math.cos(a) * 13, gy + Math.sin(a) * 13]); }
        ctx.beginPath(); ctx.moveTo(pts2[0][0], pts2[0][1]);
        pts2.forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.restore();
    });

    // Member bar text
    ctx.save(); ctx.font = "800 32px Arial"; ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff"; ctx.shadowColor = "rgba(200,180,255,0.4)"; ctx.shadowBlur = 14;
    ctx.fillText(`You are the ${memberNumber}th Member`, W / 2, bY + bH / 2 + 12);
    ctx.restore();

    // Bottom tagline
    ctx.save(); ctx.font = "600 20px Arial"; ctx.textAlign = "center";
    ctx.fillStyle = "rgba(138,192,255,0.55)";
    ctx.fillText("Enjoy your stay in our community!", W / 2, H - 62);
    ctx.restore();

    return canvas.toBuffer("image/png");
}

module.exports.run = async function ({ api, event }) {
    const { join } = global.nodemodule["path"];
    const { writeFile, createReadStream, existsSync, readdirSync } = global.nodemodule["fs-extra"];
    const { threadID } = event;

    try {
        const threadInfo       = await api.getThreadInfo(threadID);
        const threadName       = threadInfo.threadName || "Our Group";
        const participantCount = threadInfo.participantIDs.length;

        let groupImageSrc = null;
        try {
            if (threadInfo.imageSrc && threadInfo.imageSrc.trim()) {
                groupImageSrc = threadInfo.imageSrc.trim();
            }
        } catch (_) {}

        const isBotAdded = event.logMessageData.addedParticipants.some(
            u => u.userFbId == api.getCurrentUserID()
        );

        // ── Bot added to group ──
        if (isBotAdded) {
            try {
                api.changeNickname(
                    `「 ${global.config.PREFIX} 」➢ ${global.config.BOTNAME || "SAGOR BOT"}`,
                    threadID, api.getCurrentUserID()
                );
            } catch (_) {}

            const videoDir = join(__dirname, "cache", "joinGif");
            const { extname } = global.nodemodule["path"];
            let att = [];
            if (existsSync(videoDir)) {
                att = readdirSync(videoDir)
                    .filter(f => extname(f).toLowerCase() === ".mp4")
                    .map(f => createReadStream(join(videoDir, f)));
            }
            return api.sendMessage({
                body:
                    `「 ${global.config.BOTNAME || "SAGOR BOT"} 」 𝗶𝘀 𝗻𝗼𝘄 𝗰𝗼𝗻𝗻𝗲𝗰𝘁𝗲𝗱 𝘁𝗼 "${threadName}".\n\n` +
                    `𝗠𝗲𝗺𝗯𝗲𝗿𝘀: ${participantCount}\n𝗣𝗿𝗲𝗳𝗶𝘅: ${global.config.PREFIX}\n` +
                    `𝗧𝘆𝗽𝗲 ${global.config.PREFIX}𝗵𝗲𝗹𝗽 𝘁𝗼 𝘀𝗲𝗲 𝗮𝗹𝗹 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀.`,
                attachment: att.length ? att : null
            }, threadID);
        }

        // ── New member(s) joined ──
        const addedUsers = event.logMessageData.addedParticipants;
        const adderID    = (event.logMessageData.author || "").replace("fbid:", "") || event.author || "";

        let adderName = "Unknown";
        try {
            const info = await api.getUserInfo(adderID);
            adderName = info[adderID]?.name || "Unknown";
        } catch (_) {}

        for (const user of addedUsers) {
            if (user.userFbId == api.getCurrentUserID()) continue;

            const newUserID = user.userFbId;

            let newUserName = user.fullName || user.name || "";
            if (!newUserName || !newUserName.trim()) {
                try {
                    const uInfo = await api.getUserInfo(newUserID);
                    newUserName = uInfo[newUserID]?.name || "New Member";
                } catch (_) { newUserName = "New Member"; }
            }

            const memberNumber = participantCount;

            try {
                const imgBuffer = await generateWelcomeCard({
                    newUserID,
                    adderID,
                    adderName,
                    memberNumber,
                    newUserName,
                    threadName,
                    groupImageSrc
                });

                const imgPath = join(__dirname, "cache", "joinNoti", `${newUserID}.png`);
                await writeFile(imgPath, imgBuffer);

                await api.sendMessage({
                    body: "",
                    attachment: createReadStream(imgPath)
                }, threadID);

            } catch (err) {
                console.error("[joinNoti] Card error:", err);
                api.sendMessage(
                    `Welcome ${newUserName}! You are member #${memberNumber}. Added by ${adderName}.`,
                    threadID
                );
            }
        }

    } catch (err) {
        console.error("[joinNoti] Run error:", err);
    }
};
