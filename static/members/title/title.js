(function () {
  const container = document.querySelector('.grid-container');
  const canvas = document.getElementById('gridCanvas');
  const ctx = canvas.getContext('2d');

  const THEME = {
    gridColor: '#A5B4B5',
    lineWidth: 2.4,
  };

  const CEILING_H_STEPS = [0.06, 0.29, 0.51, 0.73];
  const WALL_V_STEPS = [0.035, 0.170, 0.300, 0.425, 0.545, 0.660, 0.770, 0.875];

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.scale(dpr, dpr);
    drawGrid(width, height);
  }

  function drawInfiniteCeiling(ctx, w, h, vpX, vpY, geom) {
    ctx.save();
    ctx.strokeStyle = THEME.gridColor;
    ctx.lineWidth = THEME.lineWidth;
    ctx.lineCap = 'round';

    const { innerTop, cNearX, cFarX } = geom;

    ctx.beginPath();
    ctx.moveTo(cFarX, innerTop);
    ctx.lineTo(w - cFarX, innerTop);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cNearX, 0);
    ctx.lineTo(cFarX, innerTop);
    ctx.moveTo(w - cNearX, 0);
    ctx.lineTo(w - cFarX, innerTop);
    ctx.stroke();

    CEILING_H_STEPS.forEach((t) => {
      const y = innerTop * t;
      const leftX = cNearX + (cFarX - cNearX) * t;
      const rightX = (w - cNearX) - (cFarX - cNearX) * t;

      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.lineTo(rightX, y);
      ctx.stroke();
    });

    const ceilingSpanNear = w - 2 * cNearX;
    const topRaysCount = 9;

    for (let i = 1; i < topRaysCount; i++) {
      const ratio = i / topRaysCount;
      const startX = cNearX + ceilingSpanNear * ratio;
      const endX = cFarX + (w - 2 * cFarX) * ratio;

      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(endX, innerTop);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawInfiniteSideWalls(ctx, w, h, vpX, vpY, geom) {
    ctx.save();
    ctx.strokeStyle = THEME.gridColor;
    ctx.lineWidth = THEME.lineWidth;
    ctx.lineCap = 'round';

    const { innerTop, wNearTopY, wFarTopY, wFarX, wNearBottomY, wFarBottomY } = geom;

    ['left', 'right'].forEach((side) => {
      const isLeft = side === 'left';
      const outerEdgeX = isLeft ? 0 : w;
      const farX       = isLeft ? wFarX : (w - wFarX);

      ctx.beginPath();
      ctx.moveTo(farX, wFarTopY);
      ctx.lineTo(farX, wFarBottomY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(outerEdgeX, wNearTopY);
      ctx.lineTo(farX, wFarTopY);
      ctx.moveTo(outerEdgeX, wNearBottomY);
      ctx.lineTo(farX, wFarBottomY);
      ctx.stroke();

      WALL_V_STEPS.forEach((step) => {
        const currentX = isLeft ? (farX * step) : (w - (w - farX) * step);
        const topY = wNearTopY + (wFarTopY - wNearTopY) * step;
        const bottomY = wNearBottomY + (wFarBottomY - wNearBottomY) * step;

        ctx.beginPath();
        ctx.moveTo(currentX, topY);
        ctx.lineTo(currentX, bottomY);
        ctx.stroke();
      });

      const hRaysCount = 9;
      for (let i = 1; i < hRaysCount; i++) {
        const ratio = i / hRaysCount;
        const startY = wNearTopY + (wNearBottomY - wNearTopY) * ratio;
        const endY = wFarTopY + (wFarBottomY - wFarTopY) * ratio;

        ctx.beginPath();
        ctx.moveTo(outerEdgeX, startY);
        ctx.lineTo(farX, endY);
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  function drawGrid(w, h) {
    ctx.clearRect(0, 0, w, h);

    const vpX = w * 0.5;
    const vpY = h * 0.45;

    const innerTop = h * 0.1452;
    const baselineNearX = w * 0.14;
    const baselineFarX = w * 0.284;

    const gapOffset = Math.max(12, Math.min(w, h) * 0.016);
    const slope = innerTop / (baselineFarX - baselineNearX);

    const geom = {
      innerTop: innerTop,
      cNearX: baselineNearX + gapOffset,
      cFarX: baselineFarX + gapOffset,
      wFarX: baselineFarX - gapOffset,
      wNearTopY: (innerTop + gapOffset * slope) - slope * (baselineFarX - gapOffset),
      wFarTopY: innerTop + gapOffset * slope,
      wNearBottomY: h * 0.748,
      wFarBottomY: h * 0.4862
    };

    drawInfiniteCeiling(ctx, w, h, vpX, vpY, geom);
    drawInfiniteSideWalls(ctx, w, h, vpX, vpY, geom);
  }

  function init() {
    resizeCanvas();
  }

  window.addEventListener('resize', resizeCanvas);
  init();
})();