module.exports = async (req, res, next) => {
  const ical = require('cal-parser');
  const fs = require('fs');
  const axios = require('axios');

  try {
    const { data: myCalendarString } = await axios({
      method: 'GET',
      url: 'https://calendar.google.com/calendar/ical/e0b0c2307817ba794f2be0f443348eadaf10b5376ed85ad3f2ef6539c3afa8f4%40group.calendar.google.com/public/basic.ics',
    });

    // console.log(myCalendarString);

    const parsed = ical.parseString(myCalendarString);

    // Read Calendar Metadata
    // console.log(parsed);
    // console.log(parsed.calendarData);

    // Read Events
    // console.log(parsed.events);
    req.icalParsed = parsed;
  } catch (e) {
    console.error(e);
  }

  next();
};
