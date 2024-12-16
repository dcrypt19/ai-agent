// require("dotenv").config();
const {
  SchedulerClient,
  CreateScheduleCommand,
} = require("@aws-sdk/client-scheduler");

// Configuración inicial del cliente Scheduler
const client = new SchedulerClient({
  region: "eu-north-1",
});

const lambdaRoleArn = process.env.ROLE_ARN; // ARN del rol con permiso para invocar la Lambda
const lambdaArn = process.env.LAMBDA_ARN; // ARN de tu función Lambda

/**
 * Crea un scheduler en AWS para invocar una función Lambda una hora antes de la hora especificada en la fecha de reserva.
 *
 * @param {object} targetInput - Datos a enviar a la función Lambda.
 * @param {Date} reservaDateTime - Fecha y hora de la reserva.
 */
async function createLambdaInvocationScheduler(targetInput, reservaDateTime) {
  // Restar una hora a la fecha de la reserva
  reservaDateTime.setHours(reservaDateTime.getHours() - 1);

  // Formatear para cron (los meses en JS son 0-indexados, por lo que se añade 1)
  const cronMinutes = reservaDateTime.getMinutes();
  const cronHours = reservaDateTime.getHours();
  const cronDay = reservaDateTime.getDate();
  const cronMonth = reservaDateTime.getMonth() + 1; // Añadir 1 porque getMonth() devuelve de 0-11
  const cronYear = reservaDateTime.getFullYear();

  const cronExpression = `cron(${cronMinutes} ${cronHours} ${cronDay} ${cronMonth} ? ${cronYear})`;

  const input = {
    Name: "InvokeLambdaExample", // Nombre único para el scheduler
    Description: "Scheduler to invoke Lambda function on a schedule",
    ScheduleExpression: cronExpression,
    ScheduleExpressionTimezone: "UTC",
    State: "ENABLED",
    FlexibleTimeWindow: {
      Mode: "OFF",
    },
    Target: {
      Arn: lambdaArn, // ARN de tu función Lambda
      RoleArn: lambdaRoleArn, // ARN del rol con permiso para invocar la Lambda
      Input: JSON.stringify(targetInput), // Datos adicionales a enviar a la Lambda si es necesario
    },
  };

  const command = new CreateScheduleCommand(input);

  try {
    const response = await client.send(command);
    console.log("Scheduler created successfully:", response);
    return;
  } catch (error) {
    console.error("Error creating the scheduler:", error);
    return;
  }
}

module.exports = createLambdaInvocationScheduler;
