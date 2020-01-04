const SVG_NS = 'http://www.w3.org/2000/svg';

const MIN_XGRID = 8, MIN_YGRID = 8, MIN_X = 1, MIN_Y = 1;
const MAX_XGRID = 15, MAX_YGRID = 15;
const SAMPLE_RATE = 50, SAMPLE_INTERVAL = 150; /* ms */
const HEIGHT_TRACE = 15, WIDTH_TRACE = 55;
const GRID_MODE = false;
const START_X = 100, START_Y = 470;
const LENGTH_X = 600, LENGTH_Y = 400;
let ORIGIN_X = 100, ORIGIN_Y1 = 450, ORIGIN_Y2 = 450; /* These change depending on graph */
let AXIS_XPOS_1 = START_X;
let AXIS_XPOS_2 = START_X+LENGTH_X;

const ID_GRAPH_SVG = 'svg-graph';
const ID_GUIDE_X = 'x-guide';
const ID_GUIDE_Y = 'y-guide';
const ID_LEGEND = 'legend';

const LOG_LEVEL = 1;
const LOG_LEVELS = {debug: 4, info: 3, warn: 2, error: 1};

/* 'fake' macros */
const OFFSET = (margin, idx) => margin * idx;
const HALF = (v) => v/2;
const UP = (ref, offset) => ref-offset;
const DOWN = (ref, offset) => ref+offset;
const LEFT = (ref, offset) => ref-offset;
const RIGHT = (ref, offset) => ref+offset;
const SCALE = (v, r) => v * r;
const RATIO = (c1, c2) => c1 / c2;
const MAX = (s1, s2) => s1 > s2 ? s1 : s2;
const MIN = (s1, s2) => s1 < s2 ? s1 : s2;
const DELTA = (s1, s2) => Math.abs(s1-s2);
const ELEM = (id) => document.getElementById(id);
const APPROX = (num, ref, tol) => (num >= ref-tol) && (num <= ref+tol);
const CSS = (obj) => Object.entries(obj)
  .reduce((p, [k, v]) => `${p}${k}: ${v}; `, '').trim();
const RAND = (min, max) => Math.floor(Math.random() * (max - min) ) + min;
const RGB = (r, g, b) => `rgb(${r},${g},${b})`;
const DEFINED = (v) => (typeof v !== 'undefined') && (v !== null);
const INFINITY = (v) => Math.abs(v) === Infinity;

/* loggers */
const __LOG = (l, msg, ...p) => {
  if (LOG_LEVELS[l] <= LOG_LEVEL) {
    console.log(msg, ...p);
  }
};
const DEBUG = (msg, ...p) => __LOG('debug', msg, ...p);
const INFO = (msg, ...p) => __LOG('info', msg, ...p);
const WARN = (msg, ...p) => __LOG('warn', msg, ...p);
const ERROR = (msg, ...p) => __LOG('error', msg, ...p);

const COLORS = [
  RGB(0,128,255)  /* blue */,   RGB(255,0,128)  /* magenta */,
  RGB(255,0,0)    /* red */,    RGB(0,128,0)    /* dark green */,
  RGB(128,0,255)  /* violet */, RGB(64,128,128) /* teal */,
  RGB(255,128,64) /* orange */, RGB(128,128,0)  /* dark yellow */
];

const RAND_COLOR = () => RGB(RAND(0, 255), RAND(0, 255), RAND(0, 255));
const COLOR = (() => {
  let i = 0;
  /* Loop back to first color if runs out */
  return reset_i => {
    if (reset_i) {
      i = 0;
      return;
    }
    let _i = i;
    i = i+1 >= COLORS.length ? 0 : i+1;
    return COLORS[_i];
  }
})();

/* SVG grid related macros */
const __X = (x, xlb, xub) => (x-START_X)/RATIO(LENGTH_X, xub-xlb)+xlb;
const __Y = (y, ylb, yub) => (START_Y-y)/RATIO(LENGTH_Y, yub-ylb)+ylb;
const __gX = (x, ratio) => RIGHT(ORIGIN_X, SCALE(x, ratio));
const __gY = (y, ratio, ORIGIN) => UP(ORIGIN, SCALE(y, ratio));

/* Math related "macros" */
const __ROUND = (f) => parseFloat(Math.round(f*100)/100);
const EXP = (f, d) => f.toExponential(d);
const ROUND = (f) => __ROUND(f).toFixed(0);
const FIXED = (f, d) => __ROUND(f).toFixed(d);
const ROUND_UP = (f, n) => {
  if (f === 0) return f;
  let r;
  if ((r = Math.abs(f) % n) === 0)
    return f;

  return f < 0 ? - (Math.abs(f) - r) : (f+n-r);
};

const Svgraph = () => document.getElementById(ID_GRAPH_SVG);

const __Guide = (guideId, vec1, vec2) => {
  const guide = document.getElementById(guideId);
  if (!vec1 || !vec2) return guide;

  if (!guide) {
    Svgraph().appendChild(
      line(vec1, vec2, {
        id: guideId, 'stroke': 'purple',
        'stroke-opacity': 0.3
      })
    );
  } else {
    __ns(guide, {
      x1: vec1.x, y1: vec1.y,
      x2: vec2.x, y2: vec2.y
    });
  }
};

const __Tracer = (tracerId, ORIGIN, xval, yval, xratio, yratio) => {
  const tracer = ELEM(tracerId);
  const tracerRect = ELEM(`${tracerId}-rect`);
  const tracerTxt = ELEM(`${tracerId}-text`);
  const tracerCirc = ELEM(`${tracerId}-circle`);
  const gx = __gX(xval, xratio);
  const gy = __gY(yval, yratio, ORIGIN);
  const coords = `(${FIXED(xval, 2)}, ${FIXED(yval, 2)})`;

  if (!tracer && !isNaN(yval)) {
    /*
     * For some strange reason, we can only append
     * children to <svg> elements, so that's what
     * is happening here.
     */
    let elems = [
      rect(__vec(gx, gy),
        WIDTH_TRACE, HEIGHT_TRACE, {
          id: `${tracerId}-rect`,
          stroke: 'grey',
          fill: 'white',
          'stroke-opacity': '0.3'
        }),
      text(__vec(
        RIGHT(gx, 5), DOWN(gy, 7)),
        coords, {
          id: `${tracerId}-text`,
          textLength: WIDTH_TRACE-5,
          style: CSS({
            'font-size': '9px',
            'font-weight': 'bold',
            padding: '5px',
          })
        }),
      circle(__vec(gx, gy), 3, {
        id: `${tracerId}-circle`,
        opacity: '0.5',
        fill: 'red'
      })
    ];

    Svgraph().appendChild(__ns(
      svg(tracerId), undefined, ...elems
    ));
  } else if (tracer && !isNaN(yval)) {
    __ns(tracerRect, {x: gx, y: gy});
    __ns(tracerTxt, {
      x: RIGHT(gx, 2), y: DOWN(gy, 10)
    });
    __ns(tracerCirc, {cx: gx, cy: gy});
    tracerTxt.innerHTML = coords;
  } else if (tracer) {
    tracer.removeChild(tracerRect);
    tracer.removeChild(tracerTxt);
    tracer.removeChild(tracerCirc);
    Svgraph().removeChild(tracer);
  }
};

function svg(id, ...children) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('id', id);

  if (children) {
    children.forEach(c => svg.appendChild(c));
  }
  return svg;
}

function g(id, ...children) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('id', id);

  if (children) {
    children.forEach(c => g.appendChild(c));
  }
  return g;
}

function __vec(x, y) {
  return { x, y };
}

function __ns(elem, config={}, ...children) {
  Object.keys(config).forEach(k =>
      elem.setAttribute(k, config[k])
  );

  if (children) {
    children.forEach(c => elem.appendChild(c));
  }

  return elem;
}

function line(vec_from, vec_to, config={}) {
  const l = document.createElementNS(SVG_NS, 'line');
  l.style.zIndex = '1';

  return __ns(l, {
    ...config,
    x1: vec_from.x, y1: vec_from.y,
    x2: vec_to.x  , y2: vec_to.y
  });
}

function text(vec, words, config={}) {
  const t = document.createElementNS(SVG_NS, 'text');
  t.innerHTML = words;
  t.style.zIndex = '1';

  return __ns(t, {
    ...config,
    x: vec.x, y: vec.y
  });
}

function circle(vec, r, config={}) {
  const c = document.createElementNS(SVG_NS, 'circle');

  return __ns(c, {
    ...config,
    cx: vec.x, cy: vec.y, r
  });
}

function rect(vec, width, height, config={}) {
  const r = document.createElementNS(SVG_NS, 'rect');

  return __ns(r, {
    ...config,
    x: vec.x, y: vec.y,
    width, height
  });
}

function polyline(points, config={}, cb) {
  const p = document.createElementNS(SVG_NS, 'polyline');
  p.addEventListener('mousemove', cb);

  return __ns(p, {
    points,
    ...config
  });
}

function plot(dp, ORIGIN, x_cratio, y_cratio, color) {
  let points = '';
  let i;
  let x_coord, y_coord;
  let dp_e;
  for (i=0; i<dp.length; i++) {
    dp_e = dp[i];
    if (!isNaN(dp_e.y)) {
      x_coord = MIN(__gX(dp_e.x, x_cratio), START_X+LENGTH_X);
      y_coord = MIN(__gY(dp_e.y, y_cratio, ORIGIN), START_Y);

      points += `${x_coord},${y_coord}`;
      if (i + 1 !== dp.length) {
        points += ' ';
      }
    }
  }

  return [
    polyline(points, {
      'stroke': color,
      'fill': 'none',
    }),
    polyline(points, {
      'fill': 'none',
      'stroke': 'transparent',
      'stroke-width': 5
    })
  ];
}

function xaxis({leny, lenx, lb, ub, parts, label, grid}) {
  const partitions = [];
  let i, x_coord, xval;
  const margin = lenx / parts;
  const part_val = (ub-lb) / parts;

  /*
   * Rendering x-axis intervals and text for each interval
   */
  for (i=0; i<=parts; i++) {
    x_coord = RIGHT(START_X, OFFSET(margin, i));
    partitions.push(
      line(
        __vec(x_coord, DOWN(ORIGIN_Y1, 5)),
        __vec(x_coord, UP(ORIGIN_Y1, 5)),
        {stroke: 'black'}
        )
    );
    xval = lb+SCALE(part_val, i);
    xval = Math.abs(xval) < 1 ? FIXED(xval, 1) : ROUND(xval);
    partitions.push(
      text(
        __vec(RIGHT(x_coord, 5), DOWN(ORIGIN_Y1, 20)),
        xval, {'text-anchor': 'end'}
      )
    );

    if (grid && xval !== 0) {
      partitions.push(
        line(
          __vec(x_coord, UP(START_Y, 5)),
          __vec(x_coord, UP(START_Y, leny)), {
            stroke: 'grey',
            'stroke-opacity': '0.3',
            'stroke-dasharray': '4,6'
          }
        )
      );
    }
  }

  return [
    text(__vec(
        RIGHT(START_X, HALF(lenx)), DOWN(START_Y, 50)
      ), label, {'text-anchor': 'end'}
    ),
    line(
      __vec(START_X, ORIGIN_Y1),
      __vec(RIGHT(START_X, lenx), ORIGIN_Y1),
      {'stroke': 'black'}
    ),
    /*
     * Add rectangle and make transparent to help with
     * cursor pointer hover effect.
     */
    rect(__vec(
      START_X, UP(ORIGIN_Y1,5)),
      lenx, 10, {
        fill: 'transparent',
        style: CSS({cursor: 'pointer'})
      }),
    ...partitions
  ];
}

function yaxis({leny, lenx, AXIS_XPOS, lb, ub, parts,
                 label, grid}) {
  /* Re-adjust LENGTH_Y */
  leny = START_Y-leny < 0 ? START_Y : leny;

  let partitions = [];
  let i, y_coord, yval;
  const margin = leny / parts;
  const part_val = (ub-lb) / parts;

  /* Rendering y-axis intervals & text for each interval */
  for (i=0; i<=parts; i++) {
    y_coord = START_Y - OFFSET(margin, i);
    partitions.push(
      line(
        __vec(LEFT(AXIS_XPOS,5), y_coord),
        __vec(RIGHT(AXIS_XPOS,5), y_coord),
        {'stroke': 'black'}
      )
    );

    yval = lb + SCALE(part_val, i);
    let abs_yval = Math.abs(yval);
    yval = (abs_yval >= 1000) || (abs_yval <= 0.001 && abs_yval > 0)
      ? EXP(yval, 1)
      : FIXED(yval, 2);

    partitions.push(
      text(
        __vec(LEFT(AXIS_XPOS,10), DOWN(y_coord,5)),
        yval, {'text-anchor': 'end'}
      )
    );

    if (grid && yval !== '0.00') {
      partitions.push(
        line(
          __vec(RIGHT(START_X,5), y_coord),
          __vec(RIGHT(START_X,lenx), y_coord),
          {
            'stroke': 'grey',
            'stroke-opacity': '0.5',
            'stroke-dasharray': '4,6'
          }
        )
      );
    }
  }

  return [
    text(__vec(
        LEFT(START_X, 60),
        UP(START_Y, DOWN(HALF(leny),40))
      ),
      label, {
        style: CSS({
          'text-orientation': 'sideways',
          'writing-mode': 'vertical-lr'
        }),
        'text-anchor': 'start'
      }
    ),
    line(
      __vec(AXIS_XPOS, UP(START_Y,leny)),
      __vec(AXIS_XPOS, START_Y), {
        id: 'y-axis-line',
        stroke: 'black',
      }
    ),
    /*
     * Add rectangle and make transparent to help with
     * cursor pointer hover effect.
     */
    rect(__vec(
      LEFT(AXIS_XPOS, 5), UP(START_Y,leny)),
      10, leny, {
        fill: 'transparent',
        style: CSS({cursor: 'pointer'})
      }),
    ...partitions
  ]
}

function legend(fpoints) {
  let width = 10, height = 50, rownum = 2;
  let fontsize = 14; // pixels

  let txt_elems = [], color_elems = [];

  let i, j, _i;
  let _fpoint, max_width = 0, inc_width;
  for (i=0; i<fpoints.length; i+=rownum) {
    /* Construct legend using row-major order */
    _i = MIN(i+rownum, fpoints.length);
    for (j=i; j<_i; j++) {
      _fpoint = fpoints[j];
      if (_fpoint.f.length > max_width) {
        max_width = _fpoint.f.length;
      }
      txt_elems.push(text(__vec(
        RIGHT(START_X, width), DOWN(10, 20+20*(j-i))
      ), _fpoint.f, {
        style: CSS({
          'color': _fpoint.color,
          'font-size': fontsize,
          'font-weight': 100
        })
      }));
    }

    /* Color pallet */
    inc_width = fontsize*(max_width*0.45);
    for (j=i; j<_i; j++) {
      _fpoint = fpoints[j];
      color_elems.push(rect(__vec(
          RIGHT(START_X, width+inc_width),
          DOWN(10, 10+20*(j-i))
        ), 30, fontsize, {
          fill: _fpoint.color,
          stroke: 'black'
        })
      );
    }

    /* Expand the row */
    width+=(inc_width+60);
    max_width = 0;
  }

  return [
    rect(__vec(START_X, 10), width, height, {
      'id': ID_LEGEND,
      'stroke': 'black',
      'stroke-width': '1px',
      'stroke-opacity': '0.5',
      'fill': 'transparent'
    }),
    ...txt_elems,
    ...color_elems
  ];
}

function init_plot(lb, ub, plot_len, parts,is_init=false,
                   seed_offset=0) {
  INFO(`lb: ${lb}, ub: ${ub}`);
  lb = __ROUND(lb); ub = __ROUND(ub);
  let new_lb = lb, new_ub = ub;
  let abs_lb = Math.abs(new_lb), abs_ub = Math.abs(new_ub);

  let u_parts = 0, l_parts = 0;
  if (ub === 0) {
    l_parts = parts;
  } else if (lb === 0) {
    u_parts = parts;
  } else {
    let t_ub = Math.abs(ub), t_lb = Math.abs(lb);
    u_parts = Math.ceil(parts*(t_ub/(t_ub+t_lb)));
    l_parts = parts-u_parts;
  }

  INFO(`====BEFORE=====`);
  INFO(`parts: ${parts} -> (l=${l_parts}, u=${u_parts})`);
  INFO(`lb: ${lb}, ub: ${ub}`);
  
  /*
   * This is the most important part:
   *
   * Define a 'part' as a grid piece (gp), the space that is
   * between grid pieces is the interval needed to capture all
   * the points in the given plot (as determined by upper/lower
   * bounds)
   *
   * For instance: the grid interval needed to capture the
   * lower grid (y<0) is given by: new_lb/l_parts
   * Similarly, for upper grid (y>0) is given by: new_ub/u_parts
   *
   * Then, because each grid interval must be equal (with
   * exception to log-log graphs), we take the max interval b/w
   * the lower and upper bound intervals and set that as the
   * grid interval to be used.
   */
  let partition = Math.abs(l_parts !== 0
    ? new_lb/l_parts
    : new_ub/u_parts
  );
  u_parts = Math.ceil(abs_ub/partition);

  /*
   * Do some adjustments to the upper/lower bounds given the
   * appropriate grid interval calculated in the step above.
   * The principle here is to round up to the nearest multiple
   * of the partition. This multiple has to be at least the
   * size determined by l_parts*partition amount (since we
   * don't want to miss any necessary grid space)
   */
  if (is_init) {
    let lb_ru = ROUND_UP(abs_lb, partition*l_parts);
    let ub_ru = ROUND_UP(abs_ub, partition*u_parts);
    new_lb -= (lb_ru - Math.abs(new_lb));
    new_ub += (ub_ru - Math.abs(new_ub));
  }

  parts = l_parts+u_parts;

  INFO(`partition: ${partition}`);
  INFO(`lparts: ${l_parts}, uparts: ${u_parts}`);
  INFO('=======AFTER========');
  
  if (parts === Infinity) {
    ERROR('error: parts is infinity');
    throw new Error('No matched parts');
  }

  let i, val, offset;
  let px_per_partition = plot_len/parts;
  for (i = 0; i <= parts; i++) {
    val = FIXED(new_lb+SCALE(partition, i), 2);
    DEBUG(`VALUE: ${val}`);
    if (val === '0.00' || val === '-0.00') {
      offset = OFFSET(plot_len/parts, i);

      if (seed_offset) {
        let p = __ROUND(
          RATIO(offset-seed_offset, px_per_partition)
        );
        console.log(seed_offset, offset, p);
        new_ub+=(p*partition);
        new_lb+=(p*partition);
      }
      return {
        lb: new_lb, ub: new_ub,
        offset: seed_offset || offset,
        parts
      }
    }
  }
}

function eval(funcs, xgrid, xlb, xub, ylb, yub, is_init=false) {
  let sample_amt, fpoints;

  const parser = math.parser();
  sample_amt = (xub-xlb) / (xgrid*SAMPLE_RATE);
  fpoints = funcs.map(f => {
    parser.evaluate(f);
    let points = [];
    let xval, yval;
    for (xval=xlb; xval<=xub; xval+=sample_amt) {
      yval = parser.evaluate(`f(${xval})`);
      if (!isNaN(yval) || INFINITY(yval)) {
        yub = MAX(yval, yub);
        ylb = MIN(yval, ylb);

        points.push(__vec(xval, yval));
      } else {
        points.push(__vec(xval, NaN));
      }
    }
    return {f, points, color: COLOR()};
  });

  /*
   * Bounding y-axis:
   * Write it this way so it's less confusing
   */
  if (ylb < 0) {
    ylb = is_init ? ylb*1.1 : ylb;
  } else {
    ylb = 0;
  }
  if (yub > 0) {
    yub = is_init ? yub*1.1 : yub;
  } else {
    yub = 0;
  }

  return {fpoints, sample_amt,
    xub, xlb, yub, ylb};
}

function render(config, funcs1, funcs2, xlb, xub,
                ylb1, yub1, ylb2, yub2,
                xgrid, ygrid1, ygrid2) {
  let sample_amt1, sample_amt2, fpoints1, fpoints2;

  if (config) {
    DEBUG(`========START CONFIG==========`);
    DEBUG(`BEFORE: ylb: ${ylb1}, yub: ${yub1}`);
    COLOR(true);
    xgrid = MIN(MAX(xgrid+config.xm, MIN_XGRID), MAX_XGRID);
    ygrid1 = MIN(MAX(ygrid1+config.ym1, MIN_YGRID), MAX_YGRID);
    ygrid2 = MIN(MAX(ygrid2+config.ym2, MIN_YGRID), MAX_YGRID);
    xlb = MIN(xlb-config.xm, -MIN_X);
    xub = MAX(xub+config.xm, MIN_X);
    ylb1 = MIN(ylb1-config.ym1, -MIN_Y);
    yub1 = MAX(yub1+config.ym1, MIN_Y);
    ylb2 = MIN(ylb2-config.ym2, -MIN_Y);
    yub2 = MAX(yub2+config.ym2, MIN_Y);
    DEBUG(`AFTER: ylb: ${ylb1}, yub: ${yub1}`);
    DEBUG(`========END CONFIG==========`);
  }

  ({
    fpoints: fpoints1, sample_amt: sample_amt1,
    xlb, xub, ylb: ylb1, yub: yub1
  } = eval(funcs1, xgrid, xlb, xub, ylb1, yub1,
    !DEFINED(config)));

  ({
    fpoints: fpoints2, sample_amt: sample_amt2,
    xlb, xub, ylb: ylb2, yub: yub2
  } = eval(funcs2, xgrid, xlb, xub, ylb2, yub2,
    !DEFINED(config)));

  let x_offset, y_offset1, y_offset2;
  try {
    ({
      lb: xlb,
      ub: xub,
      offset: x_offset,
      parts: xgrid
    } = init_plot(xlb, xub, LENGTH_X, xgrid,
      !DEFINED(config)));
    ({
      lb: ylb1,
      ub: yub1,
      offset: y_offset1,
      parts: ygrid1
    } = init_plot(ylb1, yub1, LENGTH_Y, ygrid1,
      !DEFINED(config)));
    ({
      lb: ylb2,
      ub: yub2,
      offset: y_offset2,
      parts: ygrid2
    } = init_plot(ylb2, yub2, LENGTH_Y, ygrid2,
      !DEFINED(config), y_offset1));

    let wrapper = ELEM('wrapper');
    if (wrapper) {
      Svgraph().removeChild(ELEM('wrapper'));
    }
  } catch (err) {
    return;
  }

  ORIGIN_X = RIGHT(START_X, x_offset);
  ORIGIN_Y1 = UP(START_Y, y_offset1);
  ORIGIN_Y2 = UP(START_Y, y_offset2);

  let _svg = svg('wrapper');

  /* plot */
  __ns(_svg,
    undefined,
    ...fpoints1.map(({points, color}) => g(
      'plot', ...plot(points, ORIGIN_Y1,
        RATIO(LENGTH_X, xub-xlb),
        RATIO(LENGTH_Y, yub1-ylb1), color)
    )),
    ...fpoints2.map(({points, color}) => g(
      'plot', ...plot(points, ORIGIN_Y2,
        RATIO(LENGTH_X, xub-xlb),
        RATIO(LENGTH_Y, yub2-ylb2), color)
    )),
    g('x-axis', ...xaxis({
      leny: LENGTH_Y,
      lenx: LENGTH_X,
      lb: xlb,
      ub: xub,
      parts: xgrid,
      label: '',
      grid: GRID_MODE
    })),
    g('y-axis-1', ...yaxis({
      leny: LENGTH_Y,
      lenx: LENGTH_X,
      AXIS_XPOS: AXIS_XPOS_1,
      lb: ylb1,
      ub: yub1,
      parts: ygrid1,
      label: '',
      grid: GRID_MODE
    })),
    g('y-axis-2', ...yaxis({
      leny: LENGTH_Y,
      lenx: LENGTH_X,
      AXIS_XPOS: AXIS_XPOS_2,
      lb: ylb2,
      ub: yub2,
      parts: ygrid2,
      label: '',
      grid: GRID_MODE
    })),
  );

  Svgraph().appendChild(_svg);

  return {
    xlb, xub, ylb1, yub1, ylb2, yub2,
    xgrid, ygrid1, ygrid2,
    sample_amt1, sample_amt2, fpoints1, fpoints2
  };
}

function init() {
  /*
   * These variables are the core rendering components:
   * [x/y]lb    : Lower-bound value for x/y-axis (actual)
   * [x/y]ub    : Upper-bound value for x/y-axis (actual)
   * [x/y]grid  : Approx. # of grid intervals for x-axis
   * sample_amt : Actual x-value interval b/w each sample.
   *              e.g. f(x) = x taken at sample_amt=0.2
   *                   with xlb=-1, xub=1 would be sampled at:
   *                   x=[-1,-0.8,-0.6,-0.4,-0.2, ..., 1]
   * fpoints    : Main data structure - each elem contains 'y'
   *              values for each sample for each function
   */
  let xlb=-20, xub=20, ylb1=0, yub1=0, ylb2=0, yub2=0;
  let ygrid1=10, ygrid2=10;
  let xgrid = 15;
  let sample_amt1, sample_amt2, fpoints1, fpoints2;

  const axis1_funcs = [
    // 'f(x) = sin(x)*x',
    'f(x) = x',
    // 'f(x) = -x'
  ];

  const axis2_funcs = [
    'f(x) = cos(x)',
    // 'f(x) = log(x)',
    // 'f(x) = x^0.5',
    'f(x) = sin(x)*abs(x)+1'
  ];

  /* =========== first time render =========== */
  ({
    xlb, xub, ylb1, yub1, ylb2, yub2,
    xgrid, ygrid1, ygrid2,
    sample_amt1, sample_amt2, fpoints1, fpoints2
  } = render(undefined, axis1_funcs, axis2_funcs,
    xlb, xub, ylb1, yub1, ylb2, yub2,
    xgrid, ygrid1, ygrid2));

  Svgraph().appendChild(g('legend',
    ...legend([...fpoints1, ...fpoints2])
  ));

  /*
   * This event is triggered upon every mouse move action
   * within the SVG element. Used to handle all dynamic
   * graph renders. See implementation below for details.
   */
  let X, Y;
  Svgraph().addEventListener('mousemove', event => {
    X = event.offsetX; Y = event.offsetY;
    if (Y > START_Y || Y < START_Y-LENGTH_Y
      || X > START_X+LENGTH_X || X < START_X) {
      return;
    }

    /*
     * Formula for getting 'points' array index from cursor
     * coordinates. Basic idea is to find the X-AXIS value,
     * then translate that into the number of iterations in
     * the generation loop (see above) it took for 'xval' to
     * be the current X-AXIS value -> __X(X, xlb, xub).
     */
    const tracer_guide = (id, fpoints, ORIGIN, ylb, yub,
                          sample_amt) => {
      let idx = RATIO(__X(X, xlb, xub)-xlb, sample_amt);
      if (FIXED(idx%1, 1) === '0.0') {
        idx = Math.floor(idx);

        __Guide(ID_GUIDE_X, __vec(START_X, Y),
          __vec(RIGHT(START_X, LENGTH_X), Y)
        );
        __Guide(ID_GUIDE_Y, __vec(X, START_Y),
          __vec(X, UP(START_Y, LENGTH_Y))
        );

        /*
         * For each plot, draw out their own locations. This
         * creates a new tracer for each new plot that is
         * present on the graph and refreshes based on a fixed
         * ID convention.
         */
        fpoints.forEach(({points}, i) => {
          let vec = points[idx];
          if (DEFINED(vec)) {
            __Tracer(`tracer-${id}-${i}`, ORIGIN,
              vec.x, vec.y,
              RATIO(LENGTH_X, xub - xlb),
              RATIO(LENGTH_Y, yub - ylb)
            );
          }
        });
      }
    };

    tracer_guide('ORIGIN_Y1', fpoints1, ORIGIN_Y1,
      ylb1, yub1, sample_amt1);
    tracer_guide('ORIGIN_Y2', fpoints2,
      ORIGIN_Y2, ylb2, yub2, sample_amt2);
  });

  let intervalId = 0;
  Svgraph().addEventListener('mousedown', event => {
    X = event.offsetX; Y = event.offsetY;
    if (Y > START_Y || Y < START_Y-LENGTH_Y
      || X > START_X+LENGTH_X || X < START_X) {
      return;
    }
    const cb_setup = (xory, y1ory2) => {
      return (X, Y, oldX, oldY) => {
        let ylb = y1ory2 ? ylb1 : ylb2;
        let yub = y1ory2 ? yub1 : yub2;

        if (X === oldX && Y === oldY)
          return {xm: 0, ym1: 0, ym2: 0};

        DEBUG('=======CB_SETUP=======');
        DEBUG(`(${X},${Y}) | OLD:(${oldX},${oldY})`);
        let x_offset=0, y_offset=0;
        if (xory) { /* X-axis */
          if (DELTA(X, oldX) > 5) {
            x_offset = 2;
            if (Math.abs(__X(oldX, xlb, xub)) <
              Math.abs(__X(X, xlb, xub))) {
              x_offset *= -1;
            }
          }
        } else { /* Y-axis */
          if (DELTA(Y, oldY) > 5) {
            y_offset = 2;
            if (Math.abs(__Y(oldY, ylb, yub)) <
              Math.abs(__Y(Y, ylb, yub))) {
              y_offset *= -1;
            }
          }
        }
        DEBUG(`OFFSET: (${x_offset},${y_offset})`);
        DEBUG('=======END CB_SETUP=======');
        return {
          xm: x_offset,
          ym1: y1ory2 ? y_offset : 0,
          ym2: y1ory2 ? 0 : y_offset
        };
      }
    };

    let cb = undefined;
    if (APPROX(Y, ORIGIN_Y1, 5)) { /* X-axis */
      cb = cb_setup(true, true);
    } else if (APPROX(X, AXIS_XPOS_1, 5)) { /* Y-axis 1 */
      cb = cb_setup(false, true);
    } else if (APPROX(X, AXIS_XPOS_2, 5)) { /* Y-axis 2 */
      cb = cb_setup(false, false);
    }

    if (!DEFINED(cb) || intervalId !== 0) {
      return;
    }

    let _X = X, _Y = Y;
    intervalId = setInterval(() => {
      if (Y > START_Y || Y < START_Y-LENGTH_Y
        || X > START_X+LENGTH_X || X < START_X) {
        clearInterval(intervalId);
        intervalId = 0;
        return;
      }

      let c = cb(X, Y, _X, _Y);
      _X = X; _Y = Y;

      /*
       * Re-render with update to x/y components.
       * Render returns the updated copies of every
       * core component, so we reassign them to keep
       * up to date.
       */
      if (c.xm !== 0 || c.ym1 !== 0 || c.ym2 !== 0) {
        ({
          xlb, xub, ylb1, yub1, ylb2, yub2,
          xgrid, ygrid1, ygrid2,
          sample_amt1, sample_amt2,
          fpoints1, fpoints2
        } = render(c, axis1_funcs, axis2_funcs,
          xlb, xub, ylb1, yub1, ylb2, yub2,
          xgrid, ygrid1, ygrid2));
      }
    }, SAMPLE_INTERVAL);
  });

  Svgraph().addEventListener('mouseup', () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = 0;
    }
  });
}
