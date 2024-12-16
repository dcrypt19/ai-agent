const pool = require("../pool");

async function verMisReservas(params) {
  const { numero } = params;
  console.log("numero: ", numero);

  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT horas.hora, dias.dia, horas.estado FROM horas JOIN dias ON horas.dia_id = dias.id WHERE horas.cliente_tfn = ? AND dias.dia >= CURDATE()",
      [numero]
    );

    if (rows.length > 0) {
      const reservasStr = rows
        .map(
          (row) => `Día: ${row.dia}, Hora: ${row.hora}, Estado: ${row.estado}`
        )
        .join("\n");
      console.log(`Reservas para el número ${numero}:\n${reservasStr}`);
      return `Ha realizado las siguientes reservas:\n${reservasStr}`;
    } else {
      console.log("No hay reservas para " + numero);
      return `No tiene ninguna reserva registrada.`;
    }
  } catch (error) {
    console.error("Error al obtener las reservas:", error);
    return "Error al obtener las reservas.";
  } finally {
    if (connection) {
      // Ahora connection está definida, si getConnection fue exitoso
      connection.release();
    }
  }
}

module.exports = verMisReservas;
