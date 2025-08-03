import { Request, Response } from "express";
import { Queue } from "../models/QueueModel";

interface CreateQueueDTO {
  name: string;
}

export async function addToQueue(
  req: Request<{}, {}, CreateQueueDTO>,
  res: Response
) {
  try {
    const queueItem = await Queue.create({ name: req.body.name });
    res.status(201).json(queueItem);
  } catch (error) {
    res.status(500).json({ error: "Failed to add item to queue" });
  }
}

export async function getNextQueueItem(_: Request, res: Response) {
  try {
    const item = await Queue.findOne({
      status: { $in: ["waiting", "pending"] },
    }).sort({
      status: 1,
      createdAt: 1,
    });

    if (!item) {
      return res.status(404).json({ message: "No available items in queue" });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to get next queue item" });
  }
}

export async function acknowledgeQueueItem(req: Request, res: Response) {
  try {
    const item = await Queue.findByIdAndUpdate(
      req.params.id,
      { status: "done", updatedAt: new Date() },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item marked as done", item });
  } catch (error) {
    res.status(500).json({ error: "Failed to acknowledge queue item" });
  }
}

export async function rejectQueueItem(req: Request, res: Response) {
  try {
    const item = await Queue.findByIdAndUpdate(
      req.params.id,
      { status: "waiting", updatedAt: new Date() },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item returned to queue", item });
  } catch (error) {
    res.status(500).json({ error: "Failed to reject queue item" });
  }
}
