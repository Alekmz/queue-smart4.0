// filepath: /Users/alexmuniz/Desktop/queue/src/docs/swagger.ts
const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "Queue Management API",
    description: "API for managing queue items",
  },
  host: "localhost:3000",
  schemes: ["http"],
  components: {
    schemas: {
      Queue: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the queue item",
            example: "Sample Queue Item",
          }
        },
        required: ["name", "status"],
      },
    },
  },
};

const outputFile = "./src/docs/swagger-output.json";
const endpointsFiles = ["./src/index.ts"];

swaggerAutogen(outputFile, endpointsFiles, doc);