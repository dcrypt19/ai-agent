const pool = require("../pool");
const moment = require("moment");

async function consultarDisponibilidad(params) {
  try {
    let { dia, hora, franja } = params;
    console.log("dia: ", dia, "hora: ", hora, "franja: ", franja);

    // Comprobar y reformatear la fecha si es necesario
    if (dia) {
      // Verifica si 'dia' está en el formato correcto 'YYYY-MM-DD'
      if (!moment(dia, "YYYY-MM-DD", true).isValid()) {
        console.log(
          `El formato de 'dia' (${dia}) no es válido. Intentando reformatear.`
        );

        let fechaReformateada = moment(dia, "DD-MM-YYYY").format("YYYY-MM-DD");
        // Comprueba si la reformateada es válida, si no lo es, lanza un error
        if (moment(fechaReformateada, "YYYY-MM-DD", true).isValid()) {
          dia = fechaReformateada;
        } else {
          throw new Error(
            `No se pudo reformatear 'dia' (${dia}) a un formato válido.`
          );
        }
      }
      console.log("dia reformateado: ", dia);
    }

    if (!dia && !hora && !franja) {
      return "Horario de lunes a sabado. De 9:00 a 13:00 y de 16:00 a 20:00.";
    }

    const { today, currentTime } = getActualDateAndTime();
    let query;
    let queryParams = [];
    let rangoHoras = [];
    let horasLibres = [];

    // Definir rango de horas según la franja especificada
    if (franja === "mañana") {
      rangoHoras = ["09:00", "10:00", "11:00", "12:00", "13:00"];
    } else if (franja === "tarde") {
      rangoHoras = ["16:00", "17:00", "18:00", "19:00", "20:00"];
    }

    // Construir la consulta SQL según los parámetros proporcionados
    if (dia && !hora) {
      // Solo día (y posiblemente franja)
      query =
        dia === today
          ? "SELECT hora FROM horas WHERE dia_id = (SELECT id FROM dias WHERE dia = ?) AND estado = 'libre' AND TIME(hora) > ?"
          : "SELECT hora FROM horas WHERE dia_id = (SELECT id FROM dias WHERE dia = ?) AND estado = 'libre'";
      queryParams = dia === today ? [dia, currentTime] : [dia];

      if (franja) {
        query += " AND hora IN (?)";
        queryParams.push(rangoHoras);
      }
    } else if (dia && hora) {
      // Día y hora específica
      query =
        "SELECT hora FROM horas WHERE dia_id = (SELECT id FROM dias WHERE dia = ?) AND hora = ? AND estado = 'libre'";
      queryParams = [dia, hora];
    } else if (!dia && hora) {
      // Solo hora
      let days = getRemainingDaysOfWeekAndNext();
      for (let day of days) {
        let [rows] = await pool.query(
          "SELECT hora FROM horas WHERE dia_id = (SELECT id FROM dias WHERE dia = ?) AND hora = ? AND estado = 'libre'",
          [day, hora]
        );
        if (rows.length > 0) {
          horasLibres.push({ dia: day, hora: rows.map((row) => row.hora) });
        }
      }
      return horasLibres;
    }

    // Ejecutar la consulta SQL si se ha definido
    if (query) {
      const [rows] = await pool.query(query, queryParams);
      if (rows.length > 0) {
        const horas = rows.map((row) => row.hora);
        return `Horas libres para el ${
          dia || "día especificado"
        }:\n• ${horas.join("\n• ")}`;
      } else {
        return `No hay horas libres para el ${dia || "día especificado"}.`;
      }
    } else {
      return "Consulta no válida.";
    }
  } catch (error) {
    console.error("Error al consultar la disponibilidad:", error);
    return "Error al consultar la disponibilidad.";
  }
}

function getActualDateAndTime() {
  const now = new Date();
  return {
    today: now.toISOString().split("T")[0], // formato 'YYYY-MM-DD'
    currentTime: now.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Madrid", // Reemplaza esto con tu zona horaria
    }), // formato 'HH:MM:SS'
  };
}

function getRemainingDaysOfWeekAndNext() {
  let days = [];
  const today = moment(); // Comienza desde hoy
  const endOfNextWeek = moment().add(1, "weeks").endOf("week"); // Encuentra el final de la próxima semana

  while (today.isSameOrBefore(endOfNextWeek)) {
    days.push(today.format("YYYY-MM-DD")); // Agrega el día actual al array
    today.add(1, "days"); // Avanza al siguiente día
  }

  return days;
}

module.exports = consultarDisponibilidad;
