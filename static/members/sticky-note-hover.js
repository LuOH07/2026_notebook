// 成员卡片增强：原始 HTML 负责正文，此脚本只负责照片与座右铭切换。
(() => {
  'use strict';

  const CARD_SELECTOR = '[data-member-id]';
  const PHOTO_DIRECTORY = 'bottom/Membercards/';
  const mottos = JSON.parse(document.getElementById('member-mottos').textContent);

  // 纸张只有两种，每种只下载和处理一次。
  const paperWithoutArrow = new Map();

  function createDecorativeImage(className) {
    const image = document.createElement('img');
    image.className = className;
    image.alt = '';
    image.draggable = false;
    image.setAttribute('aria-hidden', 'true');
    return image;
  }

  function loadPaperWithoutArrow(sourceUrl) {
    if (!paperWithoutArrow.has(sourceUrl)) {
      const request = fetch(sourceUrl)
        .then((response) => {
          if (!response.ok) throw new Error('Paper request failed: ' + response.status);
          return response.text();
        })
        .then((svg) => {
          // 原纸张上这一条绿色 path 是箭头；悬停时只去掉箭头，不改其他图形。
          const arrowPath = /<path\b[^>]*fill="#175B50"[^>]*\/>/g;
          if ((svg.match(arrowPath) || []).length !== 1) {
            throw new Error('Paper arrow could not be identified');
          }
          return 'data:image/svg+xml;charset=utf-8,'
            + encodeURIComponent(svg.replace(arrowPath, ''));
        });

      paperWithoutArrow.set(sourceUrl, request);
    }

    return paperWithoutArrow.get(sourceUrl);
  }

  async function prepareHoverPaper(card) {
    const originalPaper = card.querySelector('img[class^="members-card-bg"]');
    if (!originalPaper) return;

    try {
      const sourceUrl = originalPaper.currentSrc || originalPaper.src;
      const cleanPaperUrl = await loadPaperWithoutArrow(sourceUrl);
      const hoverPaper = createDecorativeImage('sting-member-hover-paper');

      hoverPaper.addEventListener('load', () => {
        originalPaper.classList.add('sting-member-original-paper');
        card.dataset.stingArrow = 'ready';
      }, { once: true });

      card.appendChild(hoverPaper);
      hoverPaper.src = cleanPaperUrl;
    } catch (error) {
      // 网络失败时继续显示原纸张，避免把卡片变成空白。
      console.warn('Member hover paper could not load:', error);
    }
  }

  function fitPortrait(card, photo, motto, memberId) {
    const width = card.clientWidth;
    const height = card.clientHeight;
    if (!width || !height) return;

    // 按原版比例，在上边距和座右铭之间计算照片的可用空间。
    const top = height * 0.07;
    const bottom = height * 0.91;
    const mottoHeight = Math.max(20, motto.scrollHeight);
    const mottoTop = Math.max(top, bottom - mottoHeight);
    motto.style.top = (mottoTop - height * 0.03) + 'px';

    const size = Math.max(0, Math.min(width * 0.82, mottoTop - height * 0.025 - top));

    // 保留原图的个别构图修正；没有改动照片或卡片坐标。
    const adjustedSize = memberId === 'LI_Wenyu' ? size * 0.92 : size;
    const previousTop = memberId === 'LIN_Zhijun'
      ? top - height * 0.02
      : top + (size - adjustedSize) / 2;
    const extraLift = memberId === 'LI_Wenyu' || memberId === 'CAI_Chenlin'
      ? 0
      : height * 0.03;

    Object.assign(photo.style, {
      left: ((width - adjustedSize) / 2) + 'px',
      top: (previousTop - extraLift) + 'px',
      width: adjustedSize + 'px',
      height: adjustedSize + 'px',
    });
  }

  function enhanceCard(card) {
    if (card.dataset.stingPortrait) return;

    const memberId = card.dataset.memberId;
    const originalPortrait = card.querySelector('img.' + memberId);
    const originalName = card.querySelector('.' + memberId + '-text');
    if (!originalPortrait) return;

    const photo = createDecorativeImage('sting-member-hover-photo');
    const motto = document.createElement('p');
    motto.className = 'sting-member-hover-motto';
    motto.textContent = mottos[memberId];

    const updateLayout = () => fitPortrait(card, photo, motto, memberId);

    card.tabIndex = 0;
    card.setAttribute('aria-label', memberId.replace(/_/g, ' '));
    card.dataset.stingPortrait = 'loading';

    photo.addEventListener('load', () => {
      updateLayout();
      originalPortrait.classList.add('sting-member-original-photo');
      if (originalName) originalName.classList.add('sting-member-original-name');
      card.dataset.stingPortrait = 'ready';
    }, { once: true });

    photo.addEventListener('error', () => {
      card.dataset.stingPortrait = 'error';
      console.warn('Member hover portrait could not load:', memberId);
    });

    card.appendChild(photo);
    card.appendChild(motto);
    prepareHoverPaper(card);
    updateLayout();

    // 字体载入或卡片尺寸变化时重新排版；这是显示逻辑，不是验证代码。
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateLayout);
      resizeObserver.observe(card);
      resizeObserver.observe(motto);
      if (originalName) resizeObserver.observe(originalName);
    }

    const fileName = memberId.replace(/_/g, ' ') + '.svg';
    photo.src = window.stingAssetUrl(PHOTO_DIRECTORY + fileName);
  }

  // layout.html 使用 defer；此时模板已经渲染完成，不再需要全页 MutationObserver。
  document.querySelectorAll(CARD_SELECTOR).forEach(enhanceCard);
})();
