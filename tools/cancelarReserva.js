const pool = require("../pool");
const moment = require("moment");

async function cancelarReserva(params) {
  let dia = params.dia;
  const { hora, numero } = params;

  console.log("reservarHora: dia: ", dia, "hora: ", hora, "numero: ", numero);

  // Comprobar formato de fecha
  const fechaFormatoCorrecto = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaFormatoCorrecto.test(dia)) {
    // Reformatear la fecha a YYYY-MM-DD si es necesario
    dia = moment(dia, "DD-MM-YYYY").format("YYYY-MM-DD");
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT * FROM horas JOIN dias ON horas.dia_id = dias.id WHERE dias.dia = ? AND horas.hora = ? AND horas.estado = 'reservado' AND horas.cliente_tfn = ? AND dias.dia >= CURDATE()",
      [dia, hora, numero]
    );

    if (rows.length > 0) {
      const [result] = await connection.query(
        "UPDATE horas SET estado = 'libre', cliente_tfn = NULL WHERE dia_id = (SELECT id FROM dias WHERE dia = ?) AND hora = ?",
        [dia, hora]
      );

      if (result.affectedRows > 0) {
        await connection.commit();
        return `Reserva para la hora ${hora} del ${dia} cancelada correctamente.`;
      } else {
        await connection.rollback();
        return `La reserva para la hora ${hora} del ${dia} ya está cancelada.`;
      }
    } else {
      await connection.rollback();
      return `No hay ninguna reserva para cancelar.`;
    }
  } catch (error) {
    console.error("Error al cancelar la reserva:", error);
    if (connection) {
      await connection.rollback();
    }
    return "Error al cancelar la reserva.";
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = cancelarReserva;
