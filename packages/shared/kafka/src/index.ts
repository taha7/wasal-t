import { Kafka, type Producer, type Consumer, type KafkaConfig, type EachMessagePayload } from 'kafkajs';

export type { Producer, Consumer, EachMessagePayload };

export function createKafka(config: KafkaConfig): Kafka {
  return new Kafka(config);
}

export async function createProducer(kafka: Kafka): Promise<Producer> {
  const producer = kafka.producer();
  await producer.connect();
  return producer;
}

export async function createConsumer(kafka: Kafka, groupId: string): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  return consumer;
}

export async function sendMessage(
  producer: Producer,
  topic: string,
  payload: unknown,
): Promise<void> {
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }],
  });
}
