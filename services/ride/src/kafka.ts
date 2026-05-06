import { createKafka, createProducer, type Producer } from '@wasal-t/kafka';

const KAFKA_BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

const kafka = createKafka({ clientId: 'ride-service', brokers: KAFKA_BROKERS });

let _producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (!_producer) {
    _producer = await createProducer(kafka);
  }
  return _producer;
}
