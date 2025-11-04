const path = require('path');
const fs = require('fs');
const p5Middleware = require('./p5.js');

/**
 * Generates a calendar image using p5.js
 * @param {Array} events - Array of calendar events with startDate, endDate, summary
 * @param {string} outputDir - Directory to save the image (default: __dirname)
 * @returns {Promise<string>} Path to the generated image file
 */
async function generateCalendarImage(events, outputDir = __dirname) {
  return new Promise((resolve, reject) => {
    console.log('[calendar-image-generator] Starting image generation...');
    console.log('[calendar-image-generator] Events count:', events.length);
    
    // Set a timeout to detect if sketch hangs
    const timeout = setTimeout(() => {
      reject(new Error('Image generation timed out after 30 seconds'));
    }, 30000);
    
    const brat = [168, 217, 77];
    const logoPath = path.join(__dirname, 'logo.png');

    // Convert events to the format that p5.js middleware expects (with getEventsBetweenDates method)
    const icalParsed = {
      events: events.map(event => ({
        dtstart: { value: new Date(event.startDate) },
        dtend: { value: new Date(event.endDate) },
        summary: event.summary
      })),
      getEventsBetweenDates: function(startDate, endDate, inclusive) {
        return this.events.filter(event => {
          const eventDate = new Date(event.dtstart.value);
          return eventDate >= startDate && eventDate <= endDate;
        });
      }
    };

    // Create mock Express request/response/next to use p5.js middleware
    const mockReq = {
      icalParsed: icalParsed
    };
    
    const mockRes = {};
    
    let imageGenerated = false;
    const mockNext = () => {
      // When middleware calls next(), check if image was created
      setTimeout(() => {
        const outputPath = path.join(process.cwd(), 'calendar.png');
        const altPath = path.join(__dirname, 'calendar.png');
        
        if (fs.existsSync(outputPath)) {
          console.log('[calendar-image-generator] Calendar image saved successfully:', outputPath);
          clearTimeout(timeout);
          resolve(outputPath);
        } else if (fs.existsSync(altPath)) {
          console.log('[calendar-image-generator] Found calendar image at alternative path:', altPath);
          clearTimeout(timeout);
          resolve(altPath);
        } else {
          // Wait a bit more for file to be written
          setTimeout(() => {
            if (fs.existsSync(outputPath)) {
              console.log('[calendar-image-generator] Calendar image saved successfully (delayed):', outputPath);
              clearTimeout(timeout);
              resolve(outputPath);
            } else if (fs.existsSync(altPath)) {
              console.log('[calendar-image-generator] Found calendar image at alternative path (delayed):', altPath);
              clearTimeout(timeout);
              resolve(altPath);
            } else {
              clearTimeout(timeout);
              reject(new Error('Calendar image was not saved. Checked: ' + outputPath + ' and ' + altPath));
            }
          }, 2000);
        }
      }, 500);
    };
    
    try {
      console.log('[calendar-image-generator] Calling p5.js middleware...');
      p5Middleware(mockReq, mockRes, mockNext);
      console.log('[calendar-image-generator] Middleware called, waiting for image...');
    } catch (error) {
      clearTimeout(timeout);
      console.error('[calendar-image-generator] Error calling middleware:', error);
      reject(new Error(`Failed to generate calendar image: ${error.message}`));
    }

        // Using p5.js middleware directly - all drawing code is in p5.js file
    // The middleware will call mockNext() when done, which resolves the promise
  });
}

module.exports = { generateCalendarImage };
