// 오늘 플랜과 캘린더를 이미지로 만들어 카톡·메시지 등으로 공유해요.
// 화면을 그대로 찍는 대신, 앱과 같은 색으로 공유용 카드를 직접 그려요 (인터넷 없이도 돼요).

(function () {
  const W = 360;        // 이미지 가로 (화면 기준 크기)
  const SCALE = 3;      // 실제 이미지는 3배 크기로 그려서 선명하게
  const PAD = 24;
  const FONT = '-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';

  const color = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const theme = () => ({
    bg: color("--bg"), card: color("--card"), ink: color("--ink"), muted: color("--muted"),
    accent: color("--accent"), accentSoft: color("--accent-soft"),
    done: color("--done"), doneSoft: color("--done-soft"), line: color("--line"),
  });
  const appAddress = () => {
    let path = location.pathname;
    try { path = decodeURI(path); } catch (_) {}
    return (location.host + path).replace(/\/(index\.html)?$/, "");
  };

  /* ---------- 그리기 도구 ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 한글은 띄어쓰기 단위로, 너무 긴 단어는 글자 단위로 줄을 나눠요
  function wrap(ctx, text, maxW) {
    const lines = [];
    let line = "";
    for (const word of text.split(" ")) {
      const next = line ? line + " " + word : word;
      if (ctx.measureText(next).width <= maxW) { line = next; continue; }
      if (line) lines.push(line);
      line = "";
      for (const ch of word) {
        if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ""; }
        line += ch;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  // 그리는 순서를 모아 두었다가, 전체 높이를 안 뒤 한 번에 그려요
  function makeCanvas(height, ops, t) {
    const canvas = document.createElement("canvas");
    canvas.width = W * SCALE;
    canvas.height = Math.ceil(height * SCALE);
    const ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, W, height);
    ctx.textBaseline = "alphabetic";
    ops.forEach((op) => op(ctx));
    return canvas;
  }

  function footer(ops, y, t) {
    const addr = appAddress();
    ops.push((ctx) => {
      ctx.font = `500 11px ${FONT}`;
      ctx.fillStyle = t.muted;
      ctx.textAlign = "center";
      ctx.fillText(`🌱 오늘의 하찮은 플랜 · ${addr}`, W / 2, y + 14);
      ctx.textAlign = "left";
    });
    return y + 14 + PAD;
  }

  /* ---------- 오늘 플랜 카드 ---------- */
  function drawToday(list) {
    const t = theme();
    const measure = document.createElement("canvas").getContext("2d");
    const ops = [];
    let y = PAD + 6;
    const headY = y;

    ops.push((ctx) => {
      ctx.fillStyle = t.ink;
      ctx.font = `700 22px ${FONT}`;
      ctx.fillText("오늘의 하찮은 플랜 🌱", PAD, headY + 20);
      ctx.fillStyle = t.muted;
      ctx.font = `400 13px ${FONT}`;
      ctx.fillText(new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }), PAD, headY + 42);
    });
    y += 58;

    const done = list.filter((x) => x.done).length;
    const total = list.length;
    const barY = y;
    ops.push((ctx) => {
      roundRect(ctx, PAD, barY, W - PAD * 2, 8, 4);
      ctx.fillStyle = t.accentSoft;
      ctx.fill();
      if (total && done) {
        roundRect(ctx, PAD, barY, Math.max(8, (W - PAD * 2) * (done / total)), 8, 4);
        ctx.fillStyle = t.accent;
        ctx.fill();
      }
      ctx.fillStyle = t.muted;
      ctx.font = `400 12px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText(`${done} / ${total} 완료`, W - PAD, barY + 26);
      ctx.textAlign = "left";
    });
    y += 40;

    if (!list.length) {
      const emptyY = y;
      ops.push((ctx) => {
        ctx.fillStyle = t.muted;
        ctx.font = `400 14px ${FONT}`;
        ctx.fillText("오늘은 아직 할 일이 없어요", PAD, emptyY + 16);
      });
      y += 30;
    }

    for (const item of list) {
      const tag = item.source === "suggested" ? suggestLabel(item) : item.remind_at ? `⏰ ${item.remind_at}` : "";
      measure.font = `500 11px ${FONT}`;
      const tagW = tag ? measure.measureText(tag).width + 14 : 0;
      const textX = PAD + 14 + 22 + 10;
      const textW = W - PAD - 14 - textX - (tag ? tagW + 8 : 0);
      measure.font = `500 15px ${FONT}`;
      const lines = wrap(measure, item.text, textW);
      const h = Math.max(48, lines.length * 21 + 26);
      const top = y;

      ops.push((ctx) => {
        roundRect(ctx, PAD, top, W - PAD * 2, h, 14);
        ctx.fillStyle = t.card;
        ctx.fill();
        ctx.strokeStyle = t.line;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 체크 동그라미
        const cx = PAD + 14 + 11, cy = top + h / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        if (item.done) {
          ctx.fillStyle = t.done;
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = `700 13px ${FONT}`;
          ctx.textAlign = "center";
          ctx.fillText("✓", cx, cy + 5);
          ctx.textAlign = "left";
        } else {
          ctx.strokeStyle = t.accent;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // 할 일 글자 (끝낸 건 흐리게 + 가운데 줄)
        ctx.font = `500 15px ${FONT}`;
        ctx.fillStyle = item.done ? t.muted : t.ink;
        const firstY = top + h / 2 - ((lines.length - 1) * 21) / 2 + 5;
        lines.forEach((ln, i) => {
          const ly = firstY + i * 21;
          ctx.fillText(ln, textX, ly);
          if (item.done) {
            ctx.strokeStyle = t.muted;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(textX, ly - 5);
            ctx.lineTo(textX + ctx.measureText(ln).width, ly - 5);
            ctx.stroke();
          }
        });

        // 오른쪽 태그 (묶음 그림이나 알림 시간)
        if (tag) {
          const tx = W - PAD - 14 - tagW;
          roundRect(ctx, tx, cy - 11, tagW, 22, 11);
          ctx.fillStyle = t.accentSoft;
          ctx.fill();
          ctx.fillStyle = t.accent;
          ctx.font = `500 11px ${FONT}`;
          ctx.textAlign = "center";
          ctx.fillText(tag, tx + tagW / 2, cy + 4);
          ctx.textAlign = "left";
        }
      });
      y += h + 10;
    }

    if (total && done === total) {
      const cheerY = y;
      ops.push((ctx) => {
        ctx.fillStyle = t.accent;
        ctx.font = `600 15px ${FONT}`;
        ctx.textAlign = "center";
        ctx.fillText("오늘도 해냈어요! 대단해요 🎉", W / 2, cheerY + 20);
        ctx.textAlign = "left";
      });
      y += 36;
    }

    y = footer(ops, y + 8, t);
    return makeCanvas(y, ops, t);
  }

  /* ---------- 캘린더 카드 ---------- */
  function drawMonth(year, month, hist) {
    const t = theme();
    const ops = [];
    const key = `${year}-${pad(month + 1)}`;
    const today = todayStr();
    let y = PAD + 6;
    const headY = y;

    ops.push((ctx) => {
      ctx.fillStyle = t.ink;
      ctx.font = `700 22px ${FONT}`;
      ctx.fillText(`${year}년 ${month + 1}월`, PAD, headY + 20);
      ctx.fillStyle = t.muted;
      ctx.font = `400 13px ${FONT}`;
      ctx.fillText("오늘의 하찮은 플랜 기록", PAD, headY + 42);
    });
    y += 62;

    const gap = 5;
    const cw = (W - PAD * 2 - gap * 6) / 7;
    const ch = cw * 1.08;
    const dowY = y;
    ops.push((ctx) => {
      ctx.font = `500 11px ${FONT}`;
      ctx.fillStyle = t.muted;
      ctx.textAlign = "center";
      ["일", "월", "화", "수", "목", "금", "토"].forEach((d, i) => ctx.fillText(d, PAD + i * (cw + gap) + cw / 2, dowY + 12));
      ctx.textAlign = "left";
    });
    y += 22;

    const firstDow = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const rows = Math.ceil((firstDow + lastDate) / 7);
    const gridY = y;
    let days = 0, allDays = 0, sumDone = 0, sumTotal = 0;

    for (let d = 1; d <= lastDate; d++) {
      const ds = `${key}-${pad(d)}`;
      const info = hist[ds];
      if (info && info.total > 0) {
        days++;
        sumDone += info.done;
        sumTotal += info.total;
        if (info.done === info.total) allDays++;
      }
      const idx = firstDow + d - 1;
      const x = PAD + (idx % 7) * (cw + gap);
      const cy = gridY + Math.floor(idx / 7) * (ch + gap);
      ops.push((ctx) => {
        const all = info && info.total > 0 && info.done === info.total;
        roundRect(ctx, x, cy, cw, ch, 9);
        ctx.fillStyle = all ? t.doneSoft : t.card;
        ctx.fill();
        ctx.strokeStyle = ds === today ? t.accent : all ? t.done : t.line;
        ctx.lineWidth = ds === today ? 2 : 1;
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.fillStyle = t.muted;
        ctx.font = `400 9px ${FONT}`;
        ctx.fillText(String(d), x + cw / 2, cy + 12);

        if (info && info.total > 0) {
          // 완료 개수(크게) + /전체 개수(작게)
          ctx.font = `700 14px ${FONT}`;
          const a = String(info.done);
          ctx.font = `700 14px ${FONT}`;
          const aw = ctx.measureText(a).width;
          ctx.font = `500 9px ${FONT}`;
          const b = `/${info.total}`;
          const bw = ctx.measureText(b).width;
          const sx = x + cw / 2 - (aw + bw) / 2;
          ctx.textAlign = "left";
          ctx.fillStyle = all ? t.done : t.accent;
          ctx.font = `700 14px ${FONT}`;
          ctx.fillText(a, sx, cy + ch - 9);
          ctx.fillStyle = all ? t.done : t.muted;
          ctx.font = `500 9px ${FONT}`;
          ctx.fillText(b, sx + aw, cy + ch - 9);
        } else {
          ctx.fillStyle = t.line;
          ctx.font = `400 12px ${FONT}`;
          ctx.fillText("·", x + cw / 2, cy + ch - 9);
        }
        ctx.textAlign = "left";
      });
    }
    y = gridY + rows * (ch + gap) + 8;

    const sumY = y;
    ops.push((ctx) => {
      roundRect(ctx, PAD, sumY, W - PAD * 2, 58, 14);
      ctx.fillStyle = t.card;
      ctx.fill();
      ctx.strokeStyle = t.line;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = t.ink;
      ctx.font = `600 14px ${FONT}`;
      ctx.fillText(days ? `${days}일 기록 · ${sumTotal}개 중 ${sumDone}개 완료` : "이 달은 아직 기록이 없어요", W / 2, sumY + 24);
      ctx.fillStyle = allDays ? t.done : t.muted;
      ctx.font = `500 12px ${FONT}`;
      ctx.fillText(allDays ? `전부 해낸 날 ${allDays}일 🎉` : "하나씩 해나가는 중 🌱", W / 2, sumY + 44);
      ctx.textAlign = "left";
    });
    y += 58 + 10;

    y = footer(ops, y, t);
    return makeCanvas(y, ops, t);
  }

  /* ---------- 미리보기 + 공유 ---------- */
  let shareFile = null;
  let shareUrl = null;

  function toFile(canvas, name) {
    return new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(new File([blob], name, { type: "image/png" })) : reject(new Error("이미지를 만들지 못했어요"))), "image/png")
    );
  }

  async function openShare(title, canvas, name) {
    if (shareUrl) URL.revokeObjectURL(shareUrl);
    shareFile = await toFile(canvas, name);
    shareUrl = URL.createObjectURL(shareFile);
    $("shareTitle").textContent = title;
    $("shareImg").src = shareUrl;
    const canShareFile = !!(navigator.canShare && navigator.canShare({ files: [shareFile] }));
    $("shareGo").textContent = canShareFile ? "📤 공유하기" : "💾 이미지 저장하기";
    $("shareHint").textContent = canShareFile
      ? "공유 창에서 카카오톡이나 메시지를 골라주세요. 이미지를 길게 눌러 사진에 저장할 수도 있어요."
      : "이 브라우저는 바로 공유가 안 돼요. 이미지를 저장한 뒤 보내주세요.";
    const dlg = $("shareDialog");
    if (typeof dlg.showModal === "function") { if (!dlg.open) dlg.showModal(); }
    else dlg.setAttribute("open", "");
  }

  function closeShare() {
    const dlg = $("shareDialog");
    if (dlg.open) dlg.close ? dlg.close() : dlg.removeAttribute("open");
  }

  async function doShare() {
    if (!shareFile) return;
    if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
      try {
        await navigator.share({ files: [shareFile] });
        closeShare();
      } catch (err) {
        if (err && err.name !== "AbortError") alert("공유하지 못했어요. 이미지를 길게 눌러 저장한 뒤 보내주세요.");
      }
      return;
    }
    const a = document.createElement("a");
    a.href = shareUrl;
    a.download = shareFile.name;
    document.body.append(a);
    a.click();
    a.remove();
  }

  $("shareToday").onclick = async () => {
    try {
      openShare("오늘 플랜 공유하기", drawToday(tasks), `하찮은플랜-${todayStr()}.png`);
    } catch (err) { alert(err.message); }
  };

  $("shareCal").onclick = async () => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    try {
      const hist = await api(`/api/history?month=${y}-${pad(m + 1)}`);
      openShare(`${m + 1}월 캘린더 공유하기`, drawMonth(y, m, hist), `하찮은플랜-${y}-${pad(m + 1)}.png`);
    } catch (err) { alert(err.message); }
  };

  $("shareGo").onclick = doShare;
  $("shareClose").onclick = closeShare;

  // 테스트할 때 쓰려고 밖에서도 부를 수 있게 해둬요
  window.__share = { drawToday, drawMonth };
})();
