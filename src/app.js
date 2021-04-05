const WIDTH = 600;
const HEIGHT = 200;
const PADDING = 40;
const DPI_WIDTH = WIDTH * 2;
const DPI_HEIGHT = HEIGHT * 2;
const VIEW_HEIGHT = DPI_HEIGHT - PADDING * 2;
const VIEW_WIDTH = DPI_WIDTH;
const ROWS_COUNT = 5;
const CIRCLE_RADIUS = 8;

const tgChart = chart(document.getElementById("chart"), getChartData());
tgChart.init();

function chart(canvas, data) {
  // console.log(data);
  let requestAnimation;
  const ctx = canvas.getContext("2d");
  canvas.style.width = WIDTH + "px";
  canvas.style.height = HEIGHT + "px";
  canvas.width = DPI_WIDTH;
  canvas.height = DPI_HEIGHT;

  const proxy = new Proxy(
    {},
    {
      set(...args) {
        const result = Reflect.set(...args);
        // console.log("change");
        requestAnimation = requestAnimationFrame(paint);
        return result;
      },
    }
  );
  function onMouseMove({ clientX, clientY }) {
    // console.log(clientX);
    const { left } = canvas.getBoundingClientRect();

    proxy.mouse = {
      x: (clientX - left) * 2,
    };
  }
  function onMouseLeave() {
    proxy.mouse = null;
  }

  // Show dot on canvas
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);
  function clearCanvas() {
    ctx.clearRect(0, 0, DPI_WIDTH, DPI_HEIGHT);
  }

  function paint() {
    clearCanvas();
    const [yMin, yMax] = computeBoundaries(data);
    // console.log("yMix,yMax", yMin, yMax);
    const yRatio = VIEW_HEIGHT / (yMax - yMin);
    const xRatio = VIEW_WIDTH / (data.columns[0].length - 2);
    // console.log("Coefficient", yRatio);
    // console.log("Text step", textStep);
    console.log("Proxy mouse", proxy.mouse);
    /**
     *  y axis
     */

    const yData = data.columns.filter(
      (column) => data.types[column[0]] === "line"
    );
    // console.log("yData", yData);
    const xData = data.columns.filter(
      (column) => data.types[column[0]] !== "line"
    )[0];
    // console.log("xData", xData);

    // Drawing yAxis
    draw_yAxis(ctx, yMin, yMax);
    // Drawing xAxis
    draw_xAxis(ctx, xData, xRatio, proxy);

    yData.map(toCoordinates(xRatio, yRatio)).forEach((coordinates, index) => {
      const color = data.colors[yData[index][0]];
      drawLine(ctx, coordinates, { color });

      for (const [x, y] of coordinates) {
        if (isOver(proxy.mouse, x, coordinates.length)) {
          drawCircle(ctx, [x, y], color);
        }
      }
    });
  }
  paint();

  return {
    init() {
      paint();
    },
    destroy() {
      cancelAnimationFrame(requestAnimation);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    },
  };
}

/**
 * Get coordinates
 * @param xRatio
 * @param yRatio
 * @returns {function(*): *}
 */
function toCoordinates(xRatio, yRatio) {
  return (column) =>
    column
      .map((y, index) => [
        Math.floor((index - 1) * xRatio),
        Math.floor(DPI_HEIGHT - PADDING - y * yRatio),
      ])
      .filter((_, index) => index !== 0);
}

/**
 * Draw horizontal lines on y axis
 * @param ctx
 * @param yMin
 * @param yMax
 * @param textStep
 */
function draw_yAxis(ctx, yMin, yMax) {
  const step = VIEW_HEIGHT / ROWS_COUNT;
  const textStep = (yMax - yMin) / ROWS_COUNT;
  // console.log("Step height", step);
  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#bbb";
  ctx.font = "normal 20px Helvetica,sans-serif";
  ctx.fillStyle = "#96a2aa";
  for (let i = 1; i <= ROWS_COUNT; i++) {
    const y = step * i;
    // console.log("Step coordinates on y axis", y);
    const text = Math.round(yMax - textStep * i);
    // Show text on y axis and opposite numbers
    ctx.fillText(text.toString(), 0, y + PADDING - 10);
    ctx.moveTo(0, y + PADDING);
    ctx.lineTo(DPI_WIDTH, y + PADDING);
  }
  ctx.stroke();
  ctx.closePath();
}

/**
 * Draw lables on xAxis
 * @param ctx
 * @param data
 * @param xRatio
 */
function draw_xAxis(ctx, data, xRatio, { mouse }) {
  const columnsCount = 6;
  const step = Math.round(data.length / columnsCount);
  // console.log(step);
  ctx.beginPath();
  for (let i = 1; i < data.length; i++) {
    const x = i * xRatio;

    if ((i - 1) % step === 0) {
      const text = toDate(data[i]);
      // console.log("text", text);
      ctx.fillText(text.toString(), x, DPI_HEIGHT - 10);
    }

    if (isOver(mouse, x, data.length)) {
      console.log("mouse over");
      ctx.save();
      ctx.moveTo(x, PADDING / 2);
      ctx.lineTo(x, DPI_HEIGHT - PADDING);
      ctx.restore();
    }
  }
  ctx.stroke();
  ctx.closePath();
}

/**
 * Start draw lines by coordinates on canvas
 */
function drawLine(ctx, coordinates, { color }) {
  ctx.beginPath();
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  for (const [x, y] of coordinates) {
    // console.log(x,y);
    // ctx.lineTo(x, DPI_HEIGHT - PADDING - y * yRatio);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.closePath();
}

/**
 * Compute boundaries by types and columns
 * @param columns
 * @param types
 * @returns {*[]}
 */

function computeBoundaries({ columns, types }) {
  let min;
  let max;

  columns.forEach((column) => {
    if (types[column[0]] !== "line") {
      return;
    }
    if (typeof min !== "number") min = column[1];
    if (typeof max !== "number") max = column[1];
    if (min > column[1]) {
      min = column[1];
    }
    if (max < column[1]) {
      max = column[1];
    }

    for (let i = 2; i < column.length; i++) {
      // console.log(i);
      if (min > column[i]) {
        min = column[i];
      }
      if (max < column[i]) {
        max = column[i];
      }
    }
  });

  return [min, max];
}

/**
 * Chart data from Telegram
 * @returns {{types: {y0: string, y1: string, x: string}, names: {y0: string, y1: string}, columns, colors: {y0: string, y1: string}}}
 */
function getChartData() {
  return [
    {
      columns: [
        [
          "x",
          1542412800000,
          1542499200000,
          1542585600000,
          1542672000000,
          1542758400000,
          1542844800000,
          1542931200000,
          1543017600000,
          1543104000000,
          1543190400000,
          1543276800000,
          1543363200000,
          1543449600000,
          1543536000000,
          1543622400000,
          1543708800000,
          1543795200000,
          1543881600000,
          1543968000000,
          1544054400000,
          1544140800000,
          1544227200000,
          1544313600000,
          1544400000000,
          1544486400000,
          1544572800000,
          1544659200000,
          1544745600000,
          1544832000000,
          1544918400000,
          1545004800000,
          1545091200000,
          1545177600000,
          1545264000000,
          1545350400000,
          1545436800000,
          1545523200000,
          1545609600000,
          1545696000000,
          1545782400000,
          1545868800000,
          1545955200000,
          1546041600000,
          1546128000000,
          1546214400000,
          1546300800000,
          1546387200000,
          1546473600000,
          1546560000000,
          1546646400000,
          1546732800000,
          1546819200000,
          1546905600000,
          1546992000000,
          1547078400000,
          1547164800000,
          1547251200000,
          1547337600000,
          1547424000000,
          1547510400000,
          1547596800000,
          1547683200000,
          1547769600000,
          1547856000000,
          1547942400000,
          1548028800000,
          1548115200000,
          1548201600000,
          1548288000000,
          1548374400000,
          1548460800000,
          1548547200000,
          1548633600000,
          1548720000000,
          1548806400000,
          1548892800000,
          1548979200000,
          1549065600000,
          1549152000000,
          1549238400000,
          1549324800000,
          1549411200000,
          1549497600000,
          1549584000000,
          1549670400000,
          1549756800000,
          1549843200000,
          1549929600000,
          1550016000000,
          1550102400000,
          1550188800000,
          1550275200000,
          1550361600000,
          1550448000000,
          1550534400000,
          1550620800000,
          1550707200000,
          1550793600000,
          1550880000000,
          1550966400000,
          1551052800000,
          1551139200000,
          1551225600000,
          1551312000000,
          1551398400000,
          1551484800000,
          1551571200000,
          1551657600000,
          1551744000000,
          1551830400000,
          1551916800000,
          1552003200000,
        ],
        [
          "y0",
          37,
          20,
          32,
          39,
          32,
          35,
          19,
          65,
          36,
          62,
          113,
          69,
          120,
          60,
          51,
          49,
          71,
          122,
          149,
          69,
          57,
          21,
          33,
          55,
          92,
          62,
          47,
          50,
          56,
          116,
          63,
          60,
          55,
          65,
          76,
          33,
          45,
          64,
          54,
          81,
          180,
          123,
          106,
          37,
          60,
          70,
          46,
          68,
          46,
          51,
          33,
          57,
          75,
          70,
          95,
          70,
          50,
          68,
          63,
          66,
          53,
          38,
          52,
          109,
          121,
          53,
          36,
          71,
          96,
          55,
          58,
          29,
          31,
          55,
          52,
          44,
          126,
          191,
          73,
          87,
          255,
          278,
          219,
          170,
          129,
          125,
          126,
          84,
          65,
          53,
          154,
          57,
          71,
          64,
          75,
          72,
          39,
          47,
          52,
          73,
          89,
          156,
          86,
          105,
          88,
          45,
          33,
          56,
          142,
          124,
          114,
          64,
        ],
        [
          "y1",
          22,
          12,
          30,
          40,
          33,
          23,
          18,
          41,
          45,
          69,
          57,
          61,
          70,
          47,
          31,
          34,
          40,
          55,
          27,
          57,
          48,
          32,
          40,
          49,
          54,
          49,
          34,
          51,
          51,
          51,
          66,
          51,
          94,
          60,
          64,
          28,
          44,
          96,
          49,
          73,
          30,
          88,
          63,
          42,
          56,
          67,
          52,
          67,
          35,
          61,
          40,
          55,
          63,
          61,
          105,
          59,
          51,
          76,
          63,
          57,
          47,
          56,
          51,
          98,
          103,
          62,
          54,
          104,
          48,
          41,
          41,
          37,
          30,
          28,
          26,
          37,
          65,
          86,
          70,
          81,
          54,
          74,
          70,
          50,
          74,
          79,
          85,
          62,
          36,
          46,
          68,
          43,
          66,
          50,
          28,
          66,
          39,
          23,
          63,
          74,
          83,
          66,
          40,
          60,
          29,
          36,
          27,
          54,
          89,
          50,
          73,
          52,
        ],
      ],
      types: {
        y0: "line",
        y1: "line",
        x: "x",
      },
      names: {
        y0: "#0",
        y1: "#1",
      },
      colors: {
        y0: "#3DC23F",
        y1: "#F34C44",
      },
    },
  ][0];
}

function toDate(timestamp) {
  const shotMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const date = new Date(timestamp);
  return `${shotMonths[date.getMonth()]} ${date.getDate()}`;
}

function isOver(mouse, x, length) {
  if (!mouse) {
    return false;
  }
  const width = DPI_WIDTH / length;
  return Math.abs(x - mouse.x) < width / 2;
}
function drawCircle(ctx, [x, y], color) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.fillStyle = "#fff";
  ctx.arc(x, y, CIRCLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
}
