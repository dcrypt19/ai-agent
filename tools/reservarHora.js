const pool = require("../pool");
const moment = require("moment-timezone");
//.env
// require("dotenv").config();

const createLambdaInvocationScheduler = require("../services/eventBridge");

const createEvent = require("../services/createEvent");
const { sendToConnection } = require("../awsGateway");

async function reservarHora(params) {
  // let dia const hora const numero
  let dia = params.dia;
  const { hora, numero } = params;
  // let hora = params.hora;
  // let numero = params.numero;

  console.log("reservarHora: dia: ", dia, "hora: ", hora, "numero: ", numero);

  // quita los dos primeros numeros de numero
  // numero = numero.slice(2);

  // Comprobar formato de fecha
  const fechaFormatoCorrecto = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaFormatoCorrecto.test(dia)) {
    // Reformatear la fecha a YYYY-MM-DD si es necesario
    dia = moment(dia, "DD-MM-YYYY").format("YYYY-MM-DD");
  }

  // Crear un objeto Date para la fecha y hora de reserva
  const reservaDateTime = new Date(`${dia}T${hora}:00`);
  // Crear un objeto Date para la fecha y hora actuales
  const currentDateTime = new Date();

  // Comprobar si la fecha y hora de reserva son anteriores a la fecha y hora actuales
  if (reservaDateTime <= currentDateTime) {
    console.log("No se puede reservar una hora anterior o igual a la actual.");
    return "No se puede reservar una hora anterior o igual a la actual.";
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT * FROM horas WHERE dia_id = (SELECT id FROM dias WHERE dia = ?) AND hora = ? AND estado = 'libre'",
      [dia, hora]
    );

    if (rows.length > 0) {
      await connection.query(
        "UPDATE horas SET estado = 'reservado', cliente_tfn = ? WHERE dia_id = (SELECT id FROM dias WHERE dia = ?) AND hora = ?",
        [numero, dia, hora]
      );

      await connection.commit();

      const fechaActual = new Date().toISOString().split("T")[0]; // Obtener la fecha actual en formato YYYY-MM-DD

      // Incrementar el contador de reservasConfirmadas en EstadisticasDiarias
      await connection.query(
        "INSERT INTO EstadisticasDiarias (fecha, reservasConfirmadas) VALUES (?, 1) ON DUPLICATE KEY UPDATE reservasConfirmadas = reservasConfirmadas + 1",
        [fechaActual]
      );

      // Enviar notificación a todos los clientes conectados
      const [connections] = await connection.query(
        "SELECT connectionId FROM connections"
      );
      for (let connection of connections) {
        await sendToConnection(connection.connectionId, {
          type: "newMetric",
          dia,
          hora,
          numero,
        });
      }

      connection.release();

      // Aquí, puedes integrar la lógica de notificaciones o de creación de eventos que necesites.

      // Crear un evento en Google Calendar
      const event = await createEvent(dia, hora, numero);
      console.log(event);

      // Crear un evento en AWS EventBridge
      await createLambdaInvocationScheduler(
        {
          from: process.env.FROM2,
          UserPhoneID: numero,
          message: `Tu reserva para el ${dia} a las ${hora} ha sido confirmada.`,
          token: process.env.WHATSAPP_TOKEN,
        },
        reservaDateTime
      );

      console.log(
        `La hora ${hora} del ${dia} ha sido reservada para el número ${numero}.`
      );
      return `La hora ${hora} del ${dia} ha sido reservada para este usuario.`;
    } else {
      await connection.rollback();
      connection.release();
      console.log(`La hora ${hora} del ${dia} no está disponible.`);
      return `La hora ${hora} del ${dia} no está disponible.`;
    }
  } catch (error) {
    console.error("Error al reservar la hora:", error);
    return "Error al reservar la hora.";
  }
}

module.exports = reservarHora;
