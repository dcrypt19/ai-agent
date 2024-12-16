// require("dotenv").config();

const openai = require("../openaiClient.js");

const reservarHora = require("../tools/reservarHora.js");
const consultarDisponibilidad = require("../tools/consultarDisponibilidad");
const cancelarReserva = require("../tools/cancelarReserva");
const verMisReservas = require("../tools/verMisReservas");

global.reservarHora = reservarHora;
global.consultarDisponibilidad = consultarDisponibilidad;
global.cancelarReserva = cancelarReserva;
global.verMisReservas = verMisReservas;

async function statusCheck(threadId, runId) {
  let runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

  // Polling mechanism to see if runStatus is completed
  while (runStatus.status !== "completed") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

    if (runStatus.status === "requires_action") {
      //   console.log(
      //     runStatus.required_action.submit_tool_outputs.tool_calls
      //   );
      const toolCalls =
        runStatus.required_action.submit_tool_outputs.tool_calls;
      const toolOutputs = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;

        console.log(
          `This question requires us to call a function: ${functionName}`
        );

        const args = JSON.parse(toolCall.function.arguments);

        const argsArray = Object.keys(args).map((key) => args[key]);

        // Dynamically call the function with arguments
        const output = await global[functionName].apply(null, [args]);

        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: output,
        });
      }
      console.log(toolOutputs);
      // Submit tool outputs
      await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
        tool_outputs: toolOutputs,
      });
      continue; // Continue polling for the final response
    }

    //Check for failed, cancelled, or expired status
    if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
      //runSteps(threadId, runId);
      console.log(
        `Run status is '${runStatus.status}'. Unable to complete the request.`
      );
      break; // Exit the loop if the status indicates a failure or cancellation
    }
  }
  return runStatus;
}

module.exports = statusCheck;
