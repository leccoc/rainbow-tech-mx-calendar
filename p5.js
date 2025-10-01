module.exports = (req, res, next) => {
  // console.log('parsed', req.icalParsed.events);
  const icalParsed = req.icalParsed;
  const brat = [168, 217, 77];

  const p5 = require('node-p5');

  const spiral = (c, x0, y0) => {
    const p = c.createGraphics(960, 960);
    p.pixelDensity(2);
    p.push();
    const spiralBlue = [19, 59, 239];

    if (x0 || y0) {
      p.translate(x0, y0);
    }

    const leanByDegrees = -25 * (Math.PI / 180);
    p.rotate(leanByDegrees);

    p.noFill();
    p.stroke(...spiralBlue);
    p.strokeWeight(6);
    p.curve(700, 0, 0, 40, 0, 75, 700, 0);
    p.curve(-200, 100, 0, 62, 0, 75, -200, 75);
    p.curve(700, 0, 0, 62, 0, 95, 700, 0);
    p.curve(200, 85, 0, 85, -70, 122, -10, 122);
    p.curve(-100, 85, 0, 85, 0, 95, -100, 95);
    p.curve(-650, 250, -70, 122, -40, 142, -400, 200);

    p.pop();
    return p;
  };

  const blob = (c, x0, y0) => {
    const p = c.createGraphics(960, 960);

    const randomValues = [1.15, 1.25, 1.3];

    if (x0 || y0) {
      p.translate(x0, y0);
    }

    p.scale(2);

    const yellow = [255, 215, 51];
    p.noStroke();
    p.fill(...yellow);
    p.beginShape();

    // Control point
    p.curveVertex(0, 50);

    p.curveVertex(0, 50);
    p.curveVertex(50, 50);
    p.curveVertex(100, 50);
    p.curveVertex(150, 100);
    p.curveVertex(150, 150);
    p.curveVertex(100, 200 * p.random(randomValues));
    p.curveVertex(0, 200);
    p.curveVertex(-100 * p.random(randomValues), 150);
    p.curveVertex(-100, 100);
    p.curveVertex(0, 50);

    // Control point
    p.curveVertex(0, 50);

    p.endShape(p.CLOSE);
    return p;
  };

  const whiteSquiggly = (c, x0, y0) => {
    const p = c.createGraphics(960, 960);

    if (x0 || y0) {
      p.translate(x0, y0);
    }

    p.stroke('white');
    p.strokeWeight(8);
    p.noFill();
    p.curveTightness(-3);

    for (let i = 0; i < 5; i++) {
      p.curve(50 * i, 150, 50 * i, 0, 50 * (i + 1), 0, 50 * (i + 1), 150);
    }

    return p;
  };

  const title = (p, calendar) => {
    p.push();
    const now = new Date();
    const currentMonth = now.toLocaleString('es-MX', { month: 'long' });
    const titleCenterX = calendar.x + calendar.width / 2;
    const titleCenterY = calendar.y + 150;

    p.stroke('black');
    p.fill(0);
    p.textAlign(p.CENTER);
    p.textSize(80);
    p.text(
      currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1),
      titleCenterX,
      titleCenterY
    );

    const brat = [168, 217, 77];
    p.stroke(...brat);
    p.strokeWeight(3);
    p.fill(...brat);
    const increment = 1;
    const yOffset = 20;
    const xAlignment = 100;

    for (let i = 0; i < (calendar.width * 2) / 3; i += 1) {
      p.line(
        (calendar.x + calendar.width - xAlignment) / 3 + i,
        (titleCenterY + yOffset) * p.random(1, 1.03),
        (calendar.x + calendar.width - xAlignment) / 3 + i + increment,
        (titleCenterY + yOffset) * p.random(1, 1.03)
      );
    }

    p.pop();
  };

  const daysGrid = (p, calendar) => {
    p.push();
    const now = new Date();
    const currentMonth = now.getMonth();
    const firstDayOfMonth = new Date(now.getFullYear(), currentMonth, 1);
    const lastDayOfMonth = new Date(now.getFullYear(), currentMonth + 1, 0);

    const monthEvents = icalParsed.getEventsBetweenDates(
      firstDayOfMonth,
      lastDayOfMonth,
      true
    );
    monthEvents.forEach((event) => {
      console.log(event);
      event.dtstart.value = new Date(event.dtstart.value);
      event.dtend.value = new Date(event.dtend.value);
    });

    p.stroke('black');
    p.fill(0);
    p.textSize(40);

    const xAlignment = 250;
    const daysY = calendar.y + 250;

    const weekdayInGrid = firstDayOfMonth.getDay();
    let day = 1;

    for (let j = 1; j <= 6; j++) {
      for (let i = j === 1 ? weekdayInGrid - 1 : 0; i < 7; i += 1) {
        if (i === -1) {
          i = 6;
        }

        if (monthEvents.some((e) => e.dtstart.value.getDate() === day)) {
          const xCircleOffset = day < 10 ? 10 : 21;
          const yCircleOffset = 12;
          p.push();
          p.noStroke();
          p.fill(...brat);
          p.circle(
            (calendar.x + calendar.width - xAlignment) / 3 +
              i * 80 +
              xCircleOffset,
            daysY + j * 80 - yCircleOffset,
            60
          );
          p.pop();
        }

        p.text(
          day,
          (calendar.x + calendar.width - xAlignment) / 3 + i * 80,
          daysY + j * 80
        );

        if (day < lastDayOfMonth.getDate()) {
          day++;
        } else {
          j = 6;
          break;
        }
      }
    }

    p.pop();
  };

  const weekDays = (p, calendar) => {
    p.push();

    const daysYellow = [254, 216, 50];
    const xAlignment = 250;
    const daysY = calendar.y + 250;
    p.noStroke();
    p.fill(...daysYellow);
    p.circle(
      (calendar.x + calendar.width - xAlignment) / 3 + 10,
      daysY - 12,
      50
    );
    p.rect(
      (calendar.x + calendar.width - xAlignment) / 3 + 10,
      daysY - 37,
      (calendar.x + calendar.width - xAlignment) / 3 + 4 * 80,
      50
    );
    p.circle(
      (calendar.x + calendar.width - xAlignment) / 3 + 14 + 6 * 80,
      daysY - 12,
      50
    );

    p.stroke('black');
    p.fill(0);
    p.textSize(40);

    const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    for (let i = 0; i < days.length; i += 1) {
      p.text(
        days[i],
        (calendar.x + calendar.width - xAlignment) / 3 + i * 80,
        daysY
      );
    }

    p.pop();
  };

  function sketch(p, preloadedResources) {
    p.setup = () => {
      const canvasWidth = 960;
      const canvasHeight = 960;
      const canvas = p.createCanvas(canvasWidth, canvasHeight);
      const orange = [238, 115, 70];
      p.background(...orange);

      const blobGraphic = blob(p, -100, -100);
      p.image(blobGraphic, 0, 0);

      const calendar = {
        x: 100,
        y: 100,
        width: 645,
        height: 755, //705
        borderRaidus: 50,
      };

      p.stroke(0, 0, 0, 0);
      p.fill(...brat);

      p.push();
      const leanByDegrees = -2.8 * (Math.PI / 180);
      p.rotate(leanByDegrees);
      p.rect(
        70,
        140,
        calendar.width,
        calendar.height,
        calendar.borderRaidus,
        calendar.borderRaidus,
        calendar.borderRaidus,
        calendar.borderRaidus
      );
      p.pop();

      const white = 255;
      p.fill(white);
      p.rect(
        calendar.x,
        calendar.y,
        calendar.width,
        calendar.height,
        calendar.borderRaidus,
        calendar.borderRaidus,
        calendar.borderRaidus,
        calendar.borderRaidus
      );

      const spiralGraphic = spiral(p, calendar.x + calendar.width, 0);
      p.image(
        spiralGraphic,
        -(canvasWidth / 2) - 300,
        -50,
        canvasWidth * 2,
        canvasHeight * 2
      );

      const whiteSquigglyGraphic = whiteSquiggly(p, 50, 200);
      p.image(whiteSquigglyGraphic, -50, calendar.height + 40);

      p.image(
        preloadedResources.logo,
        calendar.width,
        calendar.height + 25,
        200,
        125
      );

      p.noFill();

      title(p, calendar);
      weekDays(p, calendar);
      daysGrid(p, calendar);
      p.saveCanvas(canvas, 'calendar', 'png');
      console.log('sketch saved');
    };
  }

  const resourcesToPreload = {
    logo: p5.loadImage('logo.png'),
  };

  let p5Instance = p5.createSketch(sketch, resourcesToPreload);

  next();
};
