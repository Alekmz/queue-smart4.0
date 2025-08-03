import { Router } from "express";
import {
  addToQueue,
  getNextQueueItem,
  acknowledgeQueueItem,
  rejectQueueItem,
} from "../controllers/QueueController";

const router = Router();

router.post(
  "/queue",
  /**
   * #swagger.parameters['body'] = {
   *   in: 'body',
   *   description: 'Item data.',
   * #swagger.parameters['name'] = {
     
            "in": "body",
            "required": true,
            "schema": {
              "$ref": "#/components/schemas/Queue"
            }
          
    }
   *   required: true,
   *   schema: {
   *     $ref: '#/components/schema/Queue' // Reference a defined schema
   *   }
   * }
   */
  addToQueue
);

// #swagger.tags = ['Queue']
router.get(
  "/queue/next",
  /* 
    #swagger.summary = 'Get next item in the queue'
    #swagger.description = 'Returns the next item, prioritizing waiting over pending'
    #swagger.responses[200] = { description: 'Next queue item' }
    #swagger.responses[404] = { description: 'No item available' }
  */
  getNextQueueItem
);

// #swagger.tags = ['Queue']
router.post(
  "/queue/:id/ack",
  /* 
    #swagger.summary = 'Acknowledge item'
    #swagger.parameters['id'] = {
      in: 'path',
      required: true,
      type: 'string',
      description: 'Queue item ID'
    }
    #swagger.responses[200] = { description: 'Item acknowledged' }
    #swagger.responses[404] = { description: 'Item not found' }
  */
  acknowledgeQueueItem
);

// #swagger.tags = ['Queue']
router.post(
  "/queue/:id/nack",
  /* 
    #swagger.summary = 'Reject item'
    #swagger.parameters['id'] = {
      in: 'path',
      required: true,
      type: 'string',
      description: 'Queue item ID'
    }
    #swagger.responses[200] = { description: 'Item returned to queue' }
    #swagger.responses[404] = { description: 'Item not found' }
  */
  rejectQueueItem
);

export default router;
