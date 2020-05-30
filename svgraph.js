const SVG_NS = 'http://www.w3.org/2000/svg';
const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';

const MIN_XGRID = 8, MIN_YGRID = 8, MIN_X = 1, MIN_Y = 1;
const MAX_XGRID = 15, MAX_YGRID = 15;
const MAX_LOG_XGRID = 1000;
const SAMPLE_RATE = 10, SAMPLE_INTERVAL = 70; /* ms */
const HEIGHT_TRACE = 15, WIDTH_TRACE = 80;
const GRID_MODE = true;
const SEMI_LOG_MODE = true;
const IS_CROSS_X_AXIS = true;
const MAX_WIDTH = 800, MIN_WIDTH = 400;
const MAX_HEIGHT = 700, MIN_HEIGHT = 300;
const SHOW_TRACER_GUIDE = true;

const LOG_LEVEL = 1;
const LOG_LEVELS = {debug: 4, info: 3, warn: 2, error: 1};

/* 'fake' macros */
const sg_OFFSET = (margin, idx) => margin * idx;
const sg_HALF = (v) => v/2;
const sg_UP = (ref, offset) => ref-offset;
const sg_DOWN = (ref, offset) => ref+offset;
const sg_LEFT = (ref, offset) => ref-offset;
const sg_RIGHT = (ref, offset) => ref+offset;
const sg_SCALE = (v, r) => v * r;
const sg_RATIO = (c1, c2) => c1 / c2;
const sg_MAX = (s1, s2) => s1 > s2 ? s1 : s2;
const sg_MIN = (s1, s2) => s1 < s2 ? s1 : s2;
const sg_DELTA = (s1, s2) => Math.abs(s1-s2);
const sg_ELEM = (id) => document.getElementById(id);
const sg_APPROX = (num, ref, tol) => (num >= ref-tol) && (num <= ref+tol);
const sg_CSS = (obj) => Object.entries(obj)
  .reduce((p, [k, v]) => `${p}${k}: ${v}; `, '').trim();
const sg_RAND = (min, max) => Math.floor(Math.random() * (max - min) ) + min;
const sg_RGB = (r, g, b) => `rgb(${r},${g},${b})`;
const sg_DEFINED = (v) => (typeof v !== 'undefined') && (v !== null);
const sg_INFINITY = (v) => Math.abs(v) === Infinity;
const sg_RANGE = (n, l, u) => n >= l && n < u;
const sg_CLAMP = (s, lb, ub) => sg_MIN(sg_MAX(s, lb), ub);
const sg_CLAMP_STRING = (str, limit) => str.length > limit ? `${str.slice(0,limit)} ..` : str;

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
  sg_RGB(0,128,255)  /* blue */,   sg_RGB(255,0,128)  /* magenta */,
  sg_RGB(255,0,0)    /* red */,    sg_RGB(0,128,0)    /* dark green */,
  sg_RGB(128,0,255)  /* violet */, sg_RGB(64,128,128) /* teal */,
  sg_RGB(255,128,64) /* orange */, sg_RGB(128,128,0)  /* dark yellow */
];

const sg_RAND_COLOR = () => sg_RGB(sg_RAND(0, 255), sg_RAND(0, 255), sg_RAND(0, 255));
const sg_COLOR = (() => {
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
const __X = (x, xlb, xub, startx, lenx) => (x-startx)/sg_RATIO(lenx, xub-xlb)+xlb;
const __Y = (y, ylb, yub, starty, leny) => (starty-y)/sg_RATIO(leny, yub-ylb)+ylb;
const __gX = (ORIGIN_X, x, ratio) => sg_RIGHT(ORIGIN_X, sg_SCALE(x, ratio));
const __gY = (y, ratio, ORIGIN) => sg_UP(ORIGIN, sg_SCALE(y, ratio));

/* Math related "macros" */
const sg___ROUND = (f) => parseFloat(Math.round(f*100)/100);
const sg_EXP = (f, d) => f.toExponential(d);
const sg_ROUND = (f) => sg___ROUND(f).toFixed(0);
const sg_FIXED = (f, d) => sg___ROUND(f).toFixed(d);
const sg_ROUND_UP = (f, n) => {
  if (f === 0 || n === 0) return f;

  let r;
  if ((r = Math.abs(f) % n) === 0)
    return f;

  return f < 0 ? - (Math.abs(f) - r) : (f+n-r);
};

const __Guide = function(guideId, vec1, vec2, config={}) {
  const guide = document.getElementById(guideId);
  if (!vec1 || !vec2) return guide;

  if (!guide) {
    this.get_Svgraph().appendChild(
      sg_line(vec1, vec2, {
        id: guideId,
        'stroke': 'purple',
        'stroke-opacity': 0.5,
        'stroke-width': 1,
        ...config
      })
    );
  } else {
    sg___ns(guide, {
      x1: vec1.x, y1: vec1.y,
      x2: vec2.x, y2: vec2.y
    });
  }
};

const __Tracer = function(tracerId, coords, xval, yval, xratio, yratio, ylb) {
  const tracer = sg_ELEM(tracerId);
  const tracerRect = sg_ELEM(`${tracerId}-rect`);
  const tracerTxt = sg_ELEM(`${tracerId}-text`);
  const tracerCirc = sg_ELEM(`${tracerId}-circle`);
  const gx = __gX(this.ORIGIN_X, xval, xratio);
  const gy = sg_MAX(
    sg_MIN(__gY(yval-ylb, yratio, this.START_Y), this.START_Y),
    this.START_Y-this.LENGTH_Y
  );

  if (!tracer && !isNaN(yval)) {
    /*
     * For some strange reason, we can only append
     * children to <sg_svg> elements, so that's what
     * is happening here.
     */
    let elems = [
      sg_rect(sg___vec(gx, gy),
        WIDTH_TRACE, HEIGHT_TRACE, {
          id: `${tracerId}-rect`,
          stroke: 'grey',
          fill: 'white',
          'stroke-opacity': '0.3'
        }),
      sg_text(sg___vec(
        sg_RIGHT(gx, 5), sg_DOWN(gy, 7)),
        coords, {
          id: `${tracerId}-text`,
          textLength: WIDTH_TRACE-5,
          style: sg_CSS({
            'font-size': '12px',
            'font-weight': 'normal',
            padding: '5px',
          })
        }),
      sg_circle(sg___vec(gx, gy), 3, {
        id: `${tracerId}-circle`,
        opacity: '0.5',
        fill: 'red'
      })
    ];

    this.get_Svgraph().appendChild(sg___ns(
      sg_svg(tracerId), undefined, ...elems
    ));
  } else if (tracer && !isNaN(yval)) {
    sg___ns(tracerRect, {x: gx, y: gy});
    sg___ns(tracerTxt, {
      x: sg_RIGHT(gx, 2), y: sg_DOWN(gy, 10)
    });
    sg___ns(tracerCirc, {cx: gx, cy: gy});
    tracerTxt.innerHTML = coords;
  } else if (tracer) {
    tracer.removeChild(tracerRect);
    tracer.removeChild(tracerTxt);
    tracer.removeChild(tracerCirc);
    this.get_Svgraph().removeChild(tracer);
  }
};

function sg_svg(id, ...children) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('id', id);

  if (children) {
    children.forEach(c => svg.appendChild(c));
  }
  return svg;
}

function sg_g(id, ...children) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('id', id);

  if (children) {
    children.forEach(c => g.appendChild(c));
  }
  return g;
}

function sg___vec(x, y) {
  return { x, y };
}

function sg___ns(elem, config={}, ...children) {
  Object.keys(config).forEach(k =>
    elem.setAttribute(k, config[k])
  );

  if (children) {
    children.forEach(c => elem.appendChild(c));
  }

  return elem;
}

function sg_line(vec_from, vec_to, config={}) {
  const l = document.createElementNS(SVG_NS, 'line');
  l.style.zIndex = '1';

  return sg___ns(l, {
    ...config,
    x1: vec_from.x, y1: vec_from.y,
    x2: vec_to.x  , y2: vec_to.y
  });
}

function sg_foreignObject(vec, w, h, config, ...children) {
  const f = document.createElementNS(SVG_NS, 'foreignObject');

  return sg___ns(f, {
    ...config,
    width: w, height: h,
    x: vec.x, y: vec.y,
  }, ...children);
}

function exponent(vec, base, exp, config={}) {
  const _math = document.createElementNS(MATHML_NS, 'math');
  const _msup = document.createElementNS(MATHML_NS,'msup');
  const base_mn = document.createElementNS(MATHML_NS,'mn');
  const exp_mn = document.createElementNS(MATHML_NS,'mn');
  base_mn.innerHTML = base;
  exp_mn.innerHTML = exp;
  _msup.appendChild(base_mn);
  _msup.appendChild(exp_mn);
  _math.appendChild(_msup);

  return sg___ns(
    sg_foreignObject(vec, 40, 40,
      {style: sg_CSS({'z-index': 10})},
      _math
    ),
    config
  );
}

function sg_text(vec, words, config={}) {
  const t = document.createElementNS(SVG_NS, 'text');
  if (typeof words === 'string') {
    t.innerHTML = words;
  } else {
    t.appendChild(words);
  }
  t.style.zIndex = '1';

  return sg___ns(t, {
    ...config,
    x: vec.x, y: vec.y
  });
}

function sg_circle(vec, r, config={}) {
  const c = document.createElementNS(SVG_NS, 'circle');

  return sg___ns(c, {
    ...config,
    cx: vec.x, cy: vec.y, r
  });
}

function sg_rect(vec, width, height, config={}) {
  const r = document.createElementNS(SVG_NS, 'rect');

  return sg___ns(r, {
    ...config,
    x: vec.x, y: vec.y,
    width, height
  });
}

function sg_polyline(points, config={}, cb) {
  const p = document.createElementNS(SVG_NS, 'polyline');
  p.addEventListener('mousemove', cb);

  return sg___ns(p, {
    points,
    ...config
  });
}

function sg_title(title, config={}) {
  const t = document.createElementNS(SVG_NS, 'title');
  t.innerHTML = title;

  return sg___ns(t, config);
}

function plot(ORIGIN_X, dp, x_cratio, y_cratio, color, ylb,
              START_X, START_Y, LENGTH_X) {
  INFO(`START_X: ${START_X}, ORIGIN_X: ${ORIGIN_X}`);
  INFO(`START_Y: ${START_Y}, LENGTH_X: ${LENGTH_X}`);
  INFO(`x_cratio: ${x_cratio}, y_cratio: ${y_cratio}`);
  let points = '';
  let i;
  let x_coord, y_coord;
  let dp_e;
  let p0 = dp[0];
  let x,y;
  for (i=0; i<dp.length; i++) {
    dp_e = dp[i];
    if (!isNaN(dp_e.y)) {
      x = dp_e.x - p0.x;
      y = dp_e.y;
      x_coord = sg_MIN(__gX(ORIGIN_X, x, x_cratio), START_X+LENGTH_X);
      y_coord = sg_MIN(__gY(y-ylb, y_cratio, START_Y), START_Y);

      points += `${x_coord},${y_coord}`;
      if (i+1 !== dp.length) {
        points += ' ';
      }
    }
  }

  return [
    sg_polyline(points, {
      'stroke': color,
      'fill': 'none',
    }),
    sg_polyline(points, {
      'fill': 'none',
      'stroke': 'transparent',
      'stroke-width': 5
    })
  ];
}

function xaxis({leny, lenx, lb, ub, parts, label, grid, x_cratio,
                 ORIGIN_Y1, ORIGIN_X,
                 START_X, START_Y, LENGTH_X},
               logvals=[]) {
  const partitions = [];
  let i, x_coord, xval;
  const margin = lenx / parts;
  const part_val = (ub-lb) / parts;

  /*
   * Rendering x-axis intervals and text for each interval
   */
  for (i=0; i<=parts; i++) {
    x_coord = sg_RIGHT(START_X, sg_OFFSET(margin, i));
    partitions.push(
      sg_line(
        sg___vec(x_coord, sg_DOWN(ORIGIN_Y1, 5)),
        sg___vec(x_coord, sg_UP(ORIGIN_Y1, 5)),
        {stroke: 'black'}
      )
    );
    xval = lb+sg_SCALE(part_val, i);
    xval = Number.isInteger(xval) ? xval : sg_FIXED(xval, 2);
    if (SEMI_LOG_MODE) {
      partitions.push(exponent(
        sg___vec(sg_RIGHT(x_coord, -10), sg_DOWN(ORIGIN_Y1, 5)),
        10, xval, {
          'font-size': '12px'
        }));
    } else {
      partitions.push(sg_text(
        sg___vec(sg_RIGHT(x_coord, 5), sg_DOWN(ORIGIN_Y1, 20)),
        xval, {
          'text-anchor': 'end',
          'font-size': '10px'
        })
      );
    }

    if (grid && xval !== 0) {
      partitions.push(
        sg_line(
          sg___vec(x_coord, sg_UP(START_Y, 5)),
          sg___vec(x_coord, sg_UP(START_Y, leny)), {
            'stroke': 'grey',
            'stroke-width': '0.5',
            'stroke-opacity': '0.3',
            'stroke-dasharray': '4,6'
          }
        )
      );
    }
  }

  if (SEMI_LOG_MODE && grid) {
    let p0 = logvals[0];
    let i;
    for (i=0; i<logvals.length; i++) {
      x_coord = sg_MIN(__gX(ORIGIN_X, logvals[i]-p0, x_cratio),
        START_X + LENGTH_X);
      partitions.push(sg_line(
        sg___vec(x_coord, sg_UP(START_Y, 5)),
        sg___vec(x_coord, sg_UP(START_Y, leny)), {
          'stroke': 'grey',
          'stroke-width': '0.5',
          'stroke-opacity': '0.3',
        }
      ));
    }
  }

  return [
    sg_text(sg___vec(
      sg_RIGHT(START_X, sg_HALF(lenx)), sg_DOWN(START_Y, 20)
      ), label, {'text-anchor': 'end'}
    ),
    sg_line(
      sg___vec(START_X, ORIGIN_Y1),
      sg___vec(sg_RIGHT(START_X, lenx), ORIGIN_Y1),
      {'stroke': 'black'}
    ),
    /*
     * Add rectangle and make transparent to help with
     * cursor pointer hover effect.
     */
    sg_rect(sg___vec(
      START_X, sg_UP(ORIGIN_Y1,5)),
      lenx, 10, {
        fill: 'transparent',
        style: sg_CSS({cursor: 'pointer'})
      }),
    ...partitions
  ];
}

function yaxis({leny, lenx, AXIS_XPOS, lb, ub, parts,
                 label, grid, label_postfix,
                 START_X, START_Y, LENGTH_X},
               is_left=true) {
  /* Re-adjust LENGTH_Y */
  leny = START_Y-leny < 0 ? START_Y : leny;

  let partitions = [];
  let i, y_coord, yval;
  const margin = leny / parts;
  const part_val = (ub-lb) / parts;

  /* Rendering y-axis intervals & text for each interval */
  for (i=0; i<=parts; i++) {
    y_coord = START_Y - sg_OFFSET(margin, i);
    partitions.push(
      sg_line(
        sg___vec(sg_LEFT(AXIS_XPOS,5), y_coord),
        sg___vec(sg_RIGHT(AXIS_XPOS,5), y_coord),
        {'stroke': 'black'}
      )
    );

    yval = lb + sg_SCALE(part_val, i);
    let abs_yval = Math.abs(yval);
    yval = (abs_yval >= 1000) || (abs_yval <= 0.001 && abs_yval > 0)
      ? sg_EXP(yval, 1)
      : sg_FIXED(yval, 1);

    let _yval = `${yval}${label_postfix}`;
    partitions.push(
      sg_text(
        sg___vec(
          is_left
            ? sg_LEFT(AXIS_XPOS,10)
            : sg_RIGHT(AXIS_XPOS, 40),
          sg_DOWN(y_coord,5)),
        _yval, {
          'text-anchor': 'end',
          'font-size': '12px'
        }
      )
    );

    if (grid && yval !== '0.00') {
      partitions.push(
        sg_line(
          sg___vec(sg_RIGHT(START_X,5), y_coord),
          sg___vec(sg_RIGHT(START_X,lenx), y_coord),
          {
            'stroke': 'grey',
            'stroke-width': '0.5',
            'stroke-opacity': '0.5',
            'stroke-dasharray': '4,6'
          }
        )
      );
    }
  }

  let textVec = sg___vec(
    is_left
      ? sg_LEFT(START_X, 50)
      : sg_RIGHT(START_X+LENGTH_X, 50),
    sg_UP(START_Y, sg_DOWN(sg_HALF(leny),40))
  );
  let rotateDeg = is_left ? `270deg` : `90deg`;
  let trans = is_left
    ? `-${textVec.y}px,10px`
    : `0,0`;
  return [
    sg_text(textVec,
      label, {
        style: sg_CSS({
          'transform-origin': `${textVec.x}px ${textVec.y}px`,
          'transform': `rotate(${rotateDeg}) translate(${trans})`
        }),
        'text-anchor': 'center'
      }
    ),
    sg_line(
      sg___vec(AXIS_XPOS, sg_UP(START_Y,leny)),
      sg___vec(AXIS_XPOS, START_Y), {
        id: 'y-axis-line',
        stroke: 'black',
      }
    ),
    /*
     * Add rectangle and make transparent to help with
     * cursor pointer hover effect.
     */
    sg_rect(sg___vec(
      sg_LEFT(AXIS_XPOS, 5), sg_UP(START_Y,leny)),
      10, leny, {
        fill: 'transparent',
        style: sg_CSS({cursor: 'pointer'})
      }),
    ...partitions
  ]
}

function legend(fpoints, ID_LEGEND, START_X) {
  let width = 7, heightPerRow = 16, rownum = 1;
  const fontsize = 10; // pixels
  const maxChars = 22;

  let txt_elems = [], color_elems = [];

  let i, j, _i;
  let fname, fname_full;
  let _fpoint, max_width = 0, inc_width;
  for (i=0; i<fpoints.length; i+=rownum) {
    /* Construct legend using row-major order */
    _i = sg_MIN(i+rownum, fpoints.length);
    for (j=i; j<_i; j++) {
      _fpoint = fpoints[j];

      fname_full = _fpoint.f.replace(/w/g,'ω');
      fname = sg_CLAMP_STRING(fname_full, maxChars);
      if (fname.length > max_width) {
        max_width = fname.length;
      }
      txt_elems.push(sg___ns(
        sg_text(sg___vec(
          sg_RIGHT(START_X, width), sg_DOWN(10, 10+15*(j-i))
        ), fname, {
          style: sg_CSS({
            'color': _fpoint.color,
            'font-size': `${fontsize}px`,
            'font-weight': 100
          })
        }),
        {},
        sg_title(fname_full)
      ));
    }

    /* Color pallet */
    inc_width = fontsize*(max_width*0.35);
    for (j=i; j<_i; j++) {
      _fpoint = fpoints[j];
      color_elems.push(sg_rect(sg___vec(
        sg_RIGHT(START_X, width+inc_width+10),
        sg_DOWN(10, 3+15*(j-i))
        ), 30, fontsize, {
          fill: _fpoint.color,
          stroke: 'black'
        })
      );
    }

    /* Expand the row */
    width+=(inc_width+50);
    max_width = 0;
  }

  return [
    sg_rect(sg___vec(START_X, 10), width, heightPerRow*rownum, {
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
  lb = Math.ceil(lb);
  ub = Math.ceil(ub);

  if (lb === ub) {
    return {
      lb: lb - 5, ub: ub + 5,
      offset: seed_offset, parts
    }
  }

  lb = sg___ROUND(lb); ub = sg___ROUND(ub);
  let new_lb = lb, new_ub = ub;
  let abs_lb = Math.abs(new_lb), abs_ub = Math.abs(new_ub);

  let u_parts = 0, l_parts = 0;
  if (ub === 0) {
    l_parts = parts;
  } else if (lb === 0) {
    u_parts = parts;
  } else if (lb > 0) {
    u_parts = parts;
  } else if (ub < 0) {
    l_parts = parts;
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
    ? (new_lb-sg_MIN(0,new_ub))/l_parts
    : (new_ub-sg_MAX(0,new_lb))/u_parts
  );
  u_parts = Math.ceil(Math.abs(new_ub-sg_MAX(0,new_lb))/partition);

  /*
   * Do some adjustments to the upper/lower bounds given the
   * appropriate grid interval calculated in the step above.
   * The principle here is to round up to the nearest multiple
   * of the partition. This multiple has to be at least the
   * size determined by l_parts*partition amount (since we
   * don't want to miss any necessary grid space)
   */
  let lb_ru, ub_ru;
  if (is_init && !SEMI_LOG_MODE) {
    lb_ru = sg_ROUND_UP(abs_lb, partition*l_parts);
    ub_ru = sg_ROUND_UP(abs_ub, partition*u_parts);
    new_lb -= (lb_ru - Math.abs(new_lb));
    new_ub += (ub_ru - Math.abs(new_ub));
  }

  parts = l_parts+u_parts;

  INFO(`partition: ${partition}`);
  INFO(`lb_ru: ${lb_ru}, ub_ru: ${ub_ru}`);
  INFO(`lparts: ${l_parts}, uparts: ${u_parts}`);
  INFO(`new_lb: ${new_lb}, new_ub: ${new_ub}`);
  INFO('=======AFTER========');

  if (parts === Infinity) {
    ERROR('error: parts is infinity');
    throw new Error('No matched parts');
  }

  let i, val, offset;
  let px_per_partition = plot_len/parts;
  offset = 0;
  for (i = 0; i <= parts; i++) {
    val = sg_FIXED(new_lb+sg_SCALE(partition, i), 2);
    DEBUG(`VALUE: ${val}`);
    if (val === '0.00' || val === '-0.00') {
      offset = sg_OFFSET(plot_len/parts, i);
      INFO(`current offset: ${offset}`);

      /*
       * If the offset is seeded from a previous plot, we
       * adjust the current offset
       */
      if (seed_offset) {
        let p = sg___ROUND(sg_RATIO(offset-seed_offset,
          px_per_partition));

        new_ub+=(p*partition);
        new_lb+=(p*partition);
      }

      break;
    }
  }

  INFO(`ub: ${new_ub}, lb: ${new_lb}, offset: ${offset}`);
  return {
    lb: new_lb, ub: new_ub,
    offset: offset,
    parts
  }
}

function generate_logvals(xlb, xub, is_sparse=false) {
  /*
   * Here is the log-scale conversion -> we need to evaluate
   * each function at f(x) for x = {1,2,3,..,10,20,30,..,},
   * then plot it on a log axis with the mapping described
   * as below:
   *
   * x | log(x)  x  | log(x)   x   | log(x)
   * ----------------------------------------
   * 1 |   0     10 |    1    100 |    2
   * 2 |  0.301  20 |  1.301  200 |  2.301
   * 3 |  0.477  30 |  1.477  300 |  2.477
   * 4 |  0.602  40 |  1.602  400 |  2.602
   * 5 |  0.699  50 |  1.699  500 |  2.699
   * 6 |  0.778  60 |  1.778  600 |  2.778
   * 7 |  0.845  70 |  1.845  700 |  2.845
   * 8 |  0.903  80 |  1.903  800 |  2.903
   * 9 |  0.954  90 |  1.954  900 |  2.954
   *
   * The pattern is clear: each decade in increase for
   * x reflects in an increment in log(x).
   *
   * We can leverage this pattern to make computing the
   * samples faster. First, we take only 10 samples per
   * decade (order of magnitude). While the number of samples
   * can be modulated depending on values of xlb, xub, it
   * is sufficient for now to keep it fixed at 10.
   *
   * Second, rather than computing log(x) for every x to
   * determine where along the axis each sample should
   * be placed, we can, for each decade, add fixed pre-
   * computed amounts onto the base value of the decade.
   */
  const N = 100; /* Dense log samples */
  const logdist = is_sparse
    ? [
      0,
      0.301,
      0.477,
      0.602,
      0.699,
      0.778,
      0.845,
      0.903,
      0.954
    ]
    : [...Array(N).keys()].map(v => (v+1)/N);

  let logvals = [];
  let xval;
  for (xval=xlb; xval<xub; xval++) {
    let i;
    for (i=0; i<logdist.length; i++) {
      logvals.push(xval+logdist[i]);
    }
  }

  return logvals;
}

function eval_log(funcs, xgrid, xlb, xub, xmax, ylb, yub,
                  cross_x_intercept=false,
                  fix_wrap_around=false) {
  let fpoints, points, logvals;
  INFO('EVAL_LOG', xlb, xub);

  /*
   * xlb: lower bound log(x), xub: upper bound log(x)
   */
  xub = sg_MIN(xub, MAX_LOG_XGRID);

  const parser = math.parser();
  fpoints = funcs.map(f => {
    parser.evaluate(f);

    points = [];
    let is_gm = false, is_past_gm = false;
    let _xlb = xlb, _xub = xub;
    let beg_idx;
    let prev_yval;
    let num_iters = 0;
    console.log(_xub, xmax);
    while ((!is_gm || !is_past_gm) && num_iters < 2 && _xub <= xmax) {
      beg_idx = points.length;
      xub = sg_MAX(xub, _xub);

      INFO('BEGIN_ITER:', _xlb, _xub);
      /* Only 1 iteration if not set */
      if (!cross_x_intercept) {
        is_gm = true;
        is_past_gm = true;
      }

      logvals = generate_logvals(_xlb, _xub);
      let i, yval, xlog;
      for (i=0; i<logvals.length; i++) {
        xlog = logvals[i];
        yval = parser.evaluate(`f(${Math.pow(10, xlog)})`);
        if (!isNaN(yval) && !sg_INFINITY(yval)) {
          yub = sg_MAX(yval, yub);
          ylb = sg_MIN(yval, ylb);

          if (yval < 0 && !is_gm) {
            is_gm = true;
          } else if (yval < 0 && is_gm) {
            is_past_gm = true;
          }

          INFO(xlog, yval, is_gm, is_past_gm);
          points.push(sg___vec(xlog, yval));
        } else {
          points.push(sg___vec(xlog, NaN));
        }

        prev_yval = yval;
      }

      /*
       * We don't want to continue if the function
       * is a constant.
       * Measured from the first entry in this iteration
       * to the last entry in the iteration.
       * If the "lower bound" of the window is the same
       * as the size of points -> nothing was inserted,
       * so exit.
       */
      let beg_y, end_y;
      beg_y = Math.floor(points[beg_idx].y);
      end_y = Math.floor(points[points.length-1].y);
      if (points.length === beg_idx || end_y >= beg_y) {
        is_gm = true;
        is_past_gm = true;
      }

      /* Reset */
      _xlb = Math.floor(_xub);
      _xub = _xlb + 1; // try increase 3 decades
      INFO('END_ITER:', is_gm, is_past_gm);

      num_iters++;
    }

    return {f, points, color: sg_COLOR()};
  });

  INFO('EVAL_LOG_END:', xlb, xub);
  return {fpoints, sample_amt: 1,
    xub, xlb, yub, ylb};
}

function eval(funcs, xgrid, xlb, xub, xmax, ylb, yub, is_init=false) {
  let sample_amt, fpoints;

  if (SEMI_LOG_MODE) {
    return eval_log(funcs, xgrid, xlb, xub, xmax,
      ylb, yub, IS_CROSS_X_AXIS);
  }

  /*
   * fpoints  : stores the sample points to plot on the graph.
   * xub      : x_upper_bound
   * xlb      : x_lower_bound
   * xgrid    : how many grid pieces there are
   * SAMPLE_RATE : number of samples per grid piece
   *
   * sample_amt : the interval b/w 2 samples of f(x) e.sg_g.
   * Say the bounds were from -2 to 2 (xlb=-2, xub=2),
   * SAMPLE_RATE=1 (1 sample per grid piece), and # of
   * grid pieces in x is 4, then:
   *
   * sample_amt = 2-(-2) / (4*1) = 1
   *
   * In other words: 1 sample per grid piece So we would
   * sample at x = {-2, -1, 0, 1, 2}
   *
   * In this function, for each function to be rendered,
   * calculate the points based on the described params.
   */
  const parser = math.parser();
  sample_amt = (xub-xlb) / (xgrid*SAMPLE_RATE);
  fpoints = funcs.map(f => {
    parser.evaluate(f);
    let points = [];
    let xval, yval;
    for (xval=xlb; xval<=xub; xval+=sample_amt) {
      yval = parser.evaluate(`f(${xval})`);
      if (!isNaN(yval) || sg_INFINITY(yval)) {
        yub = sg_MAX(yval, yub);
        ylb = sg_MIN(yval, ylb);

        points.push(sg___vec(xval, yval));
      } else {
        points.push(sg___vec(xval, NaN));
      }
    }
    return {f, points, color: sg_COLOR()};
  });

  return {fpoints, sample_amt,
    xub, xlb, yub, ylb};
}

function render(config, changeSet, funcs1, funcs2, xlb, xub, xmax,
                ylb1, yub1, ylb2, yub2,
                xgrid, ygrid1, ygrid2,
                sample_amt1, sample_amt2,
                fpoints1, fpoints2, is_update=false) {
  if (changeSet) {
    DEBUG(`========START CONFIG==========`);
    DEBUG(`BEFORE: ylb: ${ylb1}, yub: ${yub1}`);
    sg_COLOR(true);
    let {x_axis, left_y_axis, right_y_axis} = config;
    let {xm, ym1, ym2} = changeSet;
    let x_changed=false, y1_changed=false, y2_changed=false;

    if (!x_axis.fixed) {
      xgrid = sg_MIN(sg_MAX(xgrid+xm, MIN_XGRID), MAX_XGRID);
      xlb = sg_MIN(xlb-xm, -MIN_X);
      xub = sg_MAX(xub+xm, MIN_X);
      x_changed = true;
    }
    if (!left_y_axis.fixed) {
      ygrid1 = sg_MIN(sg_MAX(ygrid1+ym1, MIN_YGRID), MAX_YGRID);
      ylb1 = sg_MIN(ylb1-ym1, -MIN_Y);
      yub1 = sg_MAX(yub1+ym1, MIN_Y);
      y1_changed = true;
    }
    if (!right_y_axis.fixed) {
      ygrid2 = sg_MIN(sg_MAX(ygrid2+ym2, MIN_YGRID), MAX_YGRID);
      ylb2 = sg_MIN(ylb2-ym2, -MIN_Y);
      yub2 = sg_MAX(yub2+ym2, MIN_Y);
      y2_changed = true;
    }
    DEBUG(`AFTER: ylb: ${ylb1}, yub: ${yub1}`);
    DEBUG(`========END CONFIG==========`);
    if (!y1_changed && !y2_changed && !x_changed) {
      return {
        xlb, xub, ylb1, yub1, ylb2, yub2,
        xgrid, ygrid1, ygrid2,
        sample_amt1, sample_amt2, fpoints1, fpoints2
      };
    }
  }

  if (funcs1.length !== 0) {
    ({
      fpoints: fpoints1, sample_amt: sample_amt1,
      xlb, xub, ylb: ylb1, yub: yub1
    } = eval(funcs1, xgrid, xlb, xub, xmax, ylb1, yub1,
      !sg_DEFINED(changeSet)));
  } else {
    fpoints1 = [];
  }

  if (funcs2.length !== 0) {
    ({
      fpoints: fpoints2, sample_amt: sample_amt2,
      xlb, xub, ylb: ylb2, yub: yub2
    } = eval(funcs2, xgrid, xlb, xub, xmax, ylb2, yub2,
      !sg_DEFINED(changeSet)));
  } else {
    fpoints2 = [];
  }

  let x_offset, y_offset1, y_offset2;
  try {
    ({
      lb: xlb,
      ub: xub,
      offset: x_offset,
      parts: xgrid
    } = init_plot(xlb, xub, this.LENGTH_X, xgrid,
      !sg_DEFINED(changeSet)));
    if (funcs1.length !== 0) {
      ({
        lb: ylb1,
        ub: yub1,
        offset: y_offset1,
        parts: ygrid1
      } = init_plot(ylb1, yub1, this.LENGTH_Y, ygrid1,
        !sg_DEFINED(changeSet)));
    } else {
      ({
        lb: ylb2,
        ub: yub2,
        offset: y_offset2,
        parts: ygrid2
      } = init_plot(ylb2, yub2, this.LENGTH_Y, ygrid2,
        !sg_DEFINED(changeSet), y_offset1));
    }
    let wrapper = sg_ELEM(this.ID_SVG_WRAPPER);
    if (wrapper) {
      this.get_Svgraph().removeChild(sg_ELEM(this.ID_SVG_WRAPPER));
    }
  } catch (err) {
    return {
      xlb, xub, ylb1, yub1, ylb2, yub2,
      xgrid, ygrid1, ygrid2,
      sample_amt1, sample_amt2, fpoints1, fpoints2
    };
  }

  this.ORIGIN_X = sg_RIGHT(this.START_X, x_offset);
  if (!y_offset1) {
    y_offset1 = sg___ROUND(this.START_Y/2);
  }
  this.ORIGIN_Y1 = sg_UP(this.START_Y, y_offset1);
  this.ORIGIN_Y2 = this.ORIGIN_Y1;

  let _svg = sg_svg(this.ID_SVG_WRAPPER);

  INFO(`yub1: ${yub1}, ylb1: ${ylb1}`);
  /* plot */
  sg___ns(_svg,
    undefined,
    ...fpoints1.map(({points, color}) =>
      sg_g(this.ID_LEFT_PLOTS,
        ...plot(
          this.ORIGIN_X,
          points,
          sg_RATIO(this.LENGTH_X, xub-xlb),
          sg_RATIO(this.LENGTH_Y, yub1-ylb1),
          color, ylb1,
          this.START_X, this.START_Y, this.LENGTH_X
        )
      )
    ),
    ...fpoints2.map(({points, color}) =>
      sg_g(this.ID_RIGHT_PLOTS,
        ...plot(
          this.ORIGIN_X,
          points,
          sg_RATIO(this.LENGTH_X, xub-xlb),
          sg_RATIO(this.LENGTH_Y, yub2-ylb2),
          color, ylb2,
          this.START_X, this.START_Y, this.LENGTH_X
        )
      )
    ),
    sg_g(this.ID_X_AXIS, ...xaxis({
      leny: this.LENGTH_Y,
      lenx: this.LENGTH_X,
      lb: xlb,
      ub: xub,
      parts: xgrid,
      label: config.x_axis.label,
      grid: GRID_MODE,
      x_cratio: sg_RATIO(this.LENGTH_X, xub-xlb),
      ORIGIN_Y1: this.ORIGIN_Y1,
      ORIGIN_X: this.ORIGIN_X,
      START_X: this.START_X,
      START_Y: this.START_Y,
      LENGTH_X: this.LENGTH_X
    }, generate_logvals(xlb, xub, true))),
    sg_g(this.ID_LEFT_Y_AXIS, ...yaxis({
      leny: this.LENGTH_Y,
      lenx: this.LENGTH_X,
      AXIS_XPOS: this.AXIS_XPOS_1,
      lb: ylb1,
      ub: yub1,
      parts: ygrid1,
      label: config.left_y_axis.label,
      grid: GRID_MODE,
      label_postfix: '',
      START_X: this.START_X,
      START_Y: this.START_Y,
      LENGTH_X: this.LENGTH_X
    }, true, false)),
    sg_g(this.ID_RIGHT_Y_AXIS, ...yaxis({
      leny: this.LENGTH_Y,
      lenx: this.LENGTH_X,
      AXIS_XPOS: this.AXIS_XPOS_2,
      lb: ylb2,
      ub: yub2,
      parts: ygrid2,
      label: config.right_y_axis.label,
      grid: GRID_MODE,
      label_postfix: '°',
      START_X: this.START_X,
      START_Y: this.START_Y,
      LENGTH_X: this.LENGTH_X
    }, false, true)),
  );

  this.get_Svgraph().appendChild(_svg);
  if (is_update) {
    let legend_elem = sg_ELEM(this.ID_LEGEND);
    if (legend_elem) {
      this.get_Svgraph().removeChild(legend_elem);
    }
    this.get_Svgraph().appendChild(
      sg_g(this.ID_LEGEND, ...legend(
        [...fpoints1, ...fpoints2],
        this.ID_LEGEND,
        this.START_X
      )
    ));
  }

  return {
    xlb, xub, ylb1, yub1, ylb2, yub2,
    xgrid, ygrid1, ygrid2,
    sample_amt1, sample_amt2, fpoints1, fpoints2
  };
}

const SVGraph_initializer = (function()
{
  /*****************************************************
   * Constructor for SVGraph.
   *****************************************************
   * The constructor takes in 1 argument: a string ID.
   * Please make sure that this ID matches the ID on the
   * element that was created in the first step. This ID
   * will be adopted by the top-level DOM element of this
   * SVGraph instance - child elements of SVGraph will use
   * this ID as a unique namespace identifier
   * (e.sg_g. svg-graph-legend, svg-graph-xaxis, etc.).
   *
   * @param ID_GRAPH_SVG
   * @constructor
   */
  function SVGraph(ID_GRAPH_SVG='svg-graph') {
    this.ORIGIN_X = 100;
    this.ORIGIN_Y1 = 450;
    this.ORIGIN_Y2 = 450; /* These change depending on graph */

    this.ID_GRAPH_SVG = ID_GRAPH_SVG;
    this.NS = ID_GRAPH_SVG;
    this.ID_GUIDE_X = `${this.NS}-x-guide`;
    this.ID_GUIDE_Y = `${this.NS}-y-guide`;

    this.ID_LEGEND = `${this.NS}-legend`;
    this.ID_SVG_WRAPPER = `${this.NS}-wrapper`;
    this.ID_FREQUENCY_SWEEPER = `${this.NS}-freq-guide';`;

    this.ID_LEFT_PLOTS = `${this.NS}-left-plots`;
    this.ID_RIGHT_PLOTS = `${this.NS}-right-plots`;
    this.ID_X_AXIS = `${this.NS}-x-axis`;
    this.ID_LEFT_Y_AXIS = `${this.NS}-left-y-axis`;
    this.ID_RIGHT_Y_AXIS = `${this.NS}-right-y-axis`;

    if (this.get_Svgraph() === null) {
      throw new Error(
        `Cannot initialize svgraph, `
          + `cannot find element with ID \"${ID_GRAPH_SVG}\"`);
    }

    /*
      Original values:
      const START_X = 100, START_Y = 470;
      const LENGTH_X = 600, LENGTH_Y = 400;
     */
    let {
      width, height
    } = this.get_Svgraph().getBoundingClientRect();

    /*
     * Padding/spacing & dimensions:
     *
     *                     width
     *    -----------------------------------------
     *    |   |				                       |    | top
     * h  |---+------------------------------+----|
     * e  |   |				                       |	  |
     * i	|   |		        SVGraph		         |    |
     * sg_g  |   |				                       |    |
     * h  |---+------------------------------+----|
     * t  |   |				                       |    | bottom
     *    -----------------------------------------
     *     left				                       right
     */

    /* Everything is in pixels */
    let padding = {
      right: 65,
      left: 55,
      top: 35,
      bottom: 40
    };
    this.WIDTH = sg_CLAMP(width, MIN_WIDTH, MAX_WIDTH);
    this.HEIGHT = sg_CLAMP(height, MIN_HEIGHT, MAX_HEIGHT);
    this.START_X = padding.left;
    this.LENGTH_X = this.WIDTH - padding.right - padding.left;
    this.START_Y = this.HEIGHT - padding.bottom;
    this.LENGTH_Y = this.HEIGHT - padding.bottom - padding.top;

    this.AXIS_XPOS_1 = this.START_X;
    this.AXIS_XPOS_2 = this.START_X+this.LENGTH_X;

    /* Callback definitions */
    this.cb_OnXChange = () => {};
  }

  const __proto__ = SVGraph.prototype;

  __proto__.get_Svgraph = function() {
    return document.getElementById(this.ID_GRAPH_SVG);
  };

  __proto__.get_BB = function() {
    return this.get_Svgraph().getBoundingClientRect();
  };

  __proto__.onXChange = function(cb) {
    console.log('binded debug');
    INFO('Binded onXChange() callback function', cb);
    this.cb_OnXChange = cb;
  };

  __proto__.init = function(config) {
    /*
   * These variables are the core rendering components:
   * [x/y]lb    : Lower-bound value for x/y-axis (actual)
   * [x/y]ub    : Upper-bound value for x/y-axis (actual)
   * [x/y]grid  : Approx. # of grid intervals for x-axis
   * sample_amt : Actual x-value interval b/w each sample.
   *              e.sg_g. f(x) = x taken at sample_amt=0.2
   *                   with xlb=-1, xub=1 would be sampled at:
   *                   x=[-1,-0.8,-0.6,-0.4,-0.2, ..., 1]
   * fpoints    : Main data structure - each elem contains 'y'
   *              values for each sample for each function
   */
    let {left_y_axis, right_y_axis, x_axis} = config;

    let xlb=x_axis.lb, xub=x_axis.ub;
    let xmax = x_axis.max || Infinity;
    let ylb1=left_y_axis.lb, yub1=left_y_axis.ub;
    let ylb2=right_y_axis.lb, yub2=right_y_axis.ub;
    let ygrid1=left_y_axis.num_grids, ygrid2=right_y_axis.num_grids;
    let xgrid = x_axis.num_grids;

    let sample_amt1, sample_amt2, fpoints1, fpoints2;
    const axis1_funcs = [], axis2_funcs = [];

    /* =========== first time render =========== */
    ({
      xlb, xub, ylb1, yub1, ylb2, yub2,
      xgrid, ygrid1, ygrid2,
      sample_amt1, sample_amt2, fpoints1, fpoints2
    } = render.bind(this)(config, undefined,
      [], [],
      xlb, xub, xmax, ylb1, yub1, ylb2, yub2,
      xgrid, ygrid1, ygrid2,
      sample_amt1, sample_amt2,
      fpoints1, fpoints2));

    /*
     * This event is triggered upon every mouse move action
     * within the SVG element. Used to handle all dynamic
     * graph renders. See implementation below for details.
     */
    let logvals = generate_logvals(0,1);
    INFO('logvals (dense):', logvals);
    let _this = this;
    let X, Y;
    _this.get_Svgraph().addEventListener('mousemove', event => {
      _this = this;
      let {left, top} = _this.get_BB();
      X = event.clientX-left; Y = event.clientY-top;
      if (Y > _this.START_Y
          || Y < _this.START_Y-_this.LENGTH_Y
          || X > _this.START_X+_this.LENGTH_X
          || X < _this.START_X) {
        return;
      }

      /* Value of x-axis that is being moused over */
      let _x;
      _x = __X(X, xlb, xub, _this.START_X, _this.LENGTH_X);

      /*
       * Formula for getting 'points' array index from cursor
       * coordinates. Basic idea is to find the X-AXIS value,
       * then translate that into the number of iterations in
       * the generation loop (see above) it took for 'xval' to
       * be the current X-AXIS value -> __X(X, xlb, xub).
       */
      const tracer_guide = (id, fpoints, ORIGIN, ylb, yub,
                            sample_amt) => {
        let idx;
        if (!SEMI_LOG_MODE) {
          idx = sg_RATIO(_x - xlb, sample_amt);
        } else {
          let _base, _d, _add=0;

          _base = Math.floor(_x);
          _d = _x - _base;

          /*
           * Same ranges used in eval_log(), see that for
           * more detailed explanation.
           */
          let lower, upper;
          let i;
          for (i=0; i<logvals.length-1; i++) {
            lower = logvals[i];
            upper = logvals[i+1];
            if (sg_RANGE(_d, lower, upper)) {
              _add = i;
              break;
            }
          }

          /*
           * The *9 is because there are 9 values stored per
           * grid interval. So the formula comes down to:
           * idx = (# spaces in interval)*(# intervals) + (offset spaces)
           *
           * When xlb is not 0, we shift _base left
           * by floor(xlb) so _base represents the 0th
           * index of points array.
           *
           * --------------!!!!WARNING!!!!!--------------
           * This assumes xlb for LOG plots is ALWAYS an
           * integer!
           */
          _base -= Math.floor(xlb);
          idx = (logvals.length * _base) + _add;
          DEBUG('Index to add:', idx, _add, _base);
        }

        if (sg_FIXED(idx%1, 1) === '0.0' && SHOW_TRACER_GUIDE) {
          idx = Math.floor(idx);

          __Guide.bind(_this)(
            _this.ID_GUIDE_X,
            sg___vec(_this.START_X, Y),
            sg___vec(sg_RIGHT(_this.START_X, _this.LENGTH_X), Y)
          );
          __Guide.bind(_this)(
            _this.ID_GUIDE_Y,
            sg___vec(X, _this.START_Y),
            sg___vec(X, sg_UP(_this.START_Y, _this.LENGTH_Y))
          );

          /*
           * For each plot, draw out their own locations. This
           * creates a new tracer for each new plot that is
           * present on the graph and refreshes based on a fixed
           * ID convention.
           */
          fpoints.forEach(({points}, i) => {
            let p0 = points[0];
            let vec = points[idx];
            if (sg_DEFINED(vec)) {
              __Tracer.bind(_this)(`tracer-${id}-${i}`,
                SEMI_LOG_MODE
                  ? `(10e+${sg_FIXED(vec.x, 2)}, ${sg_FIXED(vec.y, 2)})`
                  : `(${sg_FIXED(vec.x, 2)}, ${sg_FIXED(vec.y, 2)})`,
                vec.x-p0.x, vec.y,
                sg_RATIO(_this.LENGTH_X, xub - xlb),
                sg_RATIO(_this.LENGTH_Y, yub - ylb),
                ylb
              );
            }
          });
        }
      };

      tracer_guide(`${_this.ID_GRAPH_SVG}-ORIGIN-Y1`,
        fpoints1, _this.ORIGIN_Y1,
        ylb1, yub1, sample_amt1);
      tracer_guide(`${_this.ID_GRAPH_SVG}-ORIGIN-Y2`,
        fpoints2, _this.ORIGIN_Y2,
        ylb2, yub2, sample_amt2);
    });

    let intervalId = 0;
    _this.get_Svgraph().addEventListener('mousedown', event => {
      _this = this;
      let {left, top} = _this.get_BB();
      X = event.clientX-left; Y = event.clientY-top;
      if (Y > _this.START_Y
          || Y < _this.START_Y-_this.LENGTH_Y
          || X > _this.START_X+_this.LENGTH_X
          || X < _this.START_X) {
        return;
      }

      const cb_render_setup = (xory, y1ory2) => {
        return (X, Y, oldX, oldY) => {
          let ylb = y1ory2 ? ylb1 : ylb2;
          let yub = y1ory2 ? yub1 : yub2;

          if (X === oldX && Y === oldY)
            return {xm: 0, ym1: 0, ym2: 0};

          DEBUG('=======CB_SETUP=======');
          DEBUG(`(${X},${Y}) | OLD:(${oldX},${oldY})`);
          let x_offset=0, y_offset=0;
          let _lenx = _this.LENGTH_X;
          let _leny = _this.LENGTH_Y;
          let _startx = _this.START_X;
          let _starty = _this.START_Y;
          if (xory) { /* X-axis */
            if (sg_DELTA(X, oldX) > 5) {
              x_offset = 2;
              if (Math.abs(__X(oldX, xlb, xub, _startx, _lenx)) <
                Math.abs(__X(X, xlb, xub, _startx, _lenx))) {
                x_offset *= -1;
              }
            }
          } else { /* Y-axis */
            if (sg_DELTA(Y, oldY) > 5) {
              y_offset = 2;
              if (Math.abs(__Y(oldY, ylb, yub, _starty, _leny)) <
                Math.abs(__Y(Y, ylb, yub, _starty, _leny))) {
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

      let cb_sweep_setup = () => {
        return () => {
          __Guide.bind(_this)(
            _this.ID_FREQUENCY_SWEEPER,
            sg___vec(X, _this.START_Y),
            sg___vec(X, sg_UP(_this.START_Y, _this.LENGTH_Y)),
            {
              'stroke': 'red',
              'stroke-opacity': 0.6,
              'stroke-width': 2
            }
          );

          /* OnXChange callback -> goes to client */
          let _x;
          _x = __X(X, xlb, xub, _this.START_X, _this.LENGTH_X);
          _x = SEMI_LOG_MODE ? Math.pow(10, _x) : _x;

          _this.cb_OnXChange(_x);
        };
      };

      let cb = undefined;

      /* X-axis */
      if (sg_APPROX(Y, _this.ORIGIN_Y1, 5)) {
        cb = cb_render_setup(true, true);
      }
      /* Y-axis 1 */
      else if (sg_APPROX(X, _this.AXIS_XPOS_1, 5)) {
        cb = cb_render_setup(false, true);
      }
      /* Y-axis 2 */
      else if (sg_APPROX(X, _this.AXIS_XPOS_2, 5)) {
        cb = cb_render_setup(false, false);
      }
      /* Anywhere but on axis -> change tracer */
      else {
        cb = cb_sweep_setup();
        cb(); // call it instantly upon mousedown
      }

      if (!sg_DEFINED(cb) || intervalId !== 0) {
        return;
      }

      let _X = X, _Y = Y;
      intervalId = setInterval(() => {
        if (Y > _this.START_Y
            || Y < _this.START_Y-_this.LENGTH_Y
            || X > _this.START_X+_this.LENGTH_X
            || X < _this.START_X) {
          clearInterval(intervalId);
          intervalId = 0;
          return;
        }

        /* Call CB */
        let c = cb(X, Y, _X, _Y);
        if (!sg_DEFINED(c)
          || (c.xm === 0 && c.ym1 === 0 && c.ym2 === 0)) {
          return;
        }

        _X = X; _Y = Y;
        /*
         * Re-render with update to x/y components.
         * Render returns the updated copies of every
         * core component, so we reassign them to keep
         * up to date.
         */
        ({
            xlb, xub, ylb1, yub1, ylb2, yub2,
            xgrid, ygrid1, ygrid2,
            sample_amt1, sample_amt2, fpoints1, fpoints2
          } = render.bind(_this)(config, c,
            axis1_funcs, axis2_funcs,
            xlb, xub, xmax, ylb1, yub1, ylb2, yub2,
            xgrid, ygrid1, ygrid2,
            sample_amt1, sample_amt2,
            fpoints1, fpoints2)
        );
      }, SAMPLE_INTERVAL);
    });

    _this.get_Svgraph().addEventListener('mouseup', () => {
      _this = this;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = 0;
      }
    });

    return {
      _this: this,
      put(left_funcs, right_funcs) {
        /* =========== Put render =========== */
        sg_COLOR(true);

        ({
          xlb, xub, ylb1, yub1, ylb2, yub2,
          xgrid, ygrid1, ygrid2,
          sample_amt1, sample_amt2, fpoints1, fpoints2
        } = render.bind(this._this)(config, undefined,
          left_funcs, right_funcs,
          xlb, xub, xmax, ylb1, yub1, ylb2, yub2,
          xgrid, ygrid1, ygrid2,
          sample_amt1, sample_amt2,
          fpoints1, fpoints2, true));
      },
      update(left_funcs, right_funcs) {
        /* =========== Update render =========== */
        sg_COLOR(true);

        axis1_funcs.push(...left_funcs);
        axis2_funcs.push(...right_funcs);

        ({
          xlb, xub, ylb1, yub1, ylb2, yub2,
          xgrid, ygrid1, ygrid2,
          sample_amt1, sample_amt2, fpoints1, fpoints2
        } = render.bind(this._this)(config, undefined,
          axis1_funcs, axis2_funcs,
          xlb, xub, xmax, ylb1, yub1, ylb2, yub2,
          xgrid, ygrid1, ygrid2,
          sample_amt1, sample_amt2,
          fpoints1, fpoints2, true));
      }
    }
  };

  return SVGraph;
})();
