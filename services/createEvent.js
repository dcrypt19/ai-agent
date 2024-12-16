const { google } = require("googleapis");
const { OAuth2 } = google.auth;
// require("dotenv").config();

const pool = require("../pool");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// console.log(CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN);

const oAuth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET);

oAuth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

// function that creates an event in google calendar, recieves the date, time and number phone of the client how made the reservation
// parameters: dia, hora, numero
// hora format: "HH:MM"
// end: hora + 1 hour
// Spain timezone
async function createEvent(dia, hora, numero) {
  console.log("dia: ", dia, "hora: ", hora, "numero: ", numero);
  try {
    const madridZone = "Europe/Madrid";
    const startDateTimeString = `${dia}T${hora}:00+02:00`; // Asume horario de verano como ejemplo
    const startDateTime = new Date(startDateTimeString);
    const endDateTime = new Date(startDateTime.getTime() + 3600000); // Añade 1 hora

    // No necesitas convertir la hora si ya está en el formato correcto
    const event = {
      summary: "Reserva de hora",
      location: "Clinica C",
      description: "Reserva de hora para cliente: " + numero,
      start: {
        dateTime: startDateTime.toISOString(), // Formato ISO con zona horaria incluida
        timeZone: madridZone,
      },
      end: {
        dateTime: endDateTime.toISOString(), // Formato ISO con zona horaria incluida
        timeZone: madridZone,
      },
      status: "confirmed",
    };

    const calendarId = "primary";
    const response = await calendar.events.insert({
      calendarId,
      resource: event,
    });

    // insert event in database
    // const connection = await pool.getConnection();
    // await connection.beginTransaction();

    return response.data;
  } catch (error) {
    console.error(error);
    return "Error al crear el evento en google calendar.";
  }
}

module.exports = createEvent;
