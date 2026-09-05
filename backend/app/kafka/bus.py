import os
import json
import asyncio
import logging
from typing import Dict, List, Callable, Any, Optional

logger = logging.getLogger("KafkaBus")

# Standard Confluent Kafka Topics for StripBoard Optimizer
TOPIC_SCENE_CATALOG = "production.scene.catalog"
TOPIC_ACTOR_CONSTRAINTS = "actor.contract.constraints"
TOPIC_DISRUPTION_ALERT = "schedule.disruption.alert"
TOPIC_AGENT_EVALUATIONS = "agent.evaluations"
TOPIC_OPTIMIZED_SOLUTION = "schedule.optimized.solution"

ALL_TOPICS = [
    TOPIC_SCENE_CATALOG,
    TOPIC_ACTOR_CONSTRAINTS,
    TOPIC_DISRUPTION_ALERT,
    TOPIC_AGENT_EVALUATIONS,
    TOPIC_OPTIMIZED_SOLUTION,
]

class ResilientKafkaBus:
    """
    Hybrid Kafka Event Mesh.
    If Confluent Kafka credentials/library are present, connects to Confluent Cloud.
    Otherwise gracefully operates as a high-performance in-memory event mesh conforming
    to the identical topic schemas and event contracts.
    """
    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[Any], Any]]] = {t: [] for t in ALL_TOPICS}
        self._events_log: List[Dict[str, Any]] = []
        self._kafka_producer = None
        self._is_confluent_connected = False

        self._init_confluent_kafka()

    def _init_confluent_kafka(self):
        bootstrap_servers = os.environ.get("CONFLUENT_BOOTSTRAP_SERVERS") or os.environ.get("KAFKA_BOOTSTRAP_SERVERS")
        api_key = os.environ.get("CONFLUENT_API_KEY")
        api_secret = os.environ.get("CONFLUENT_API_SECRET")

        if bootstrap_servers:
            try:
                from confluent_kafka import Producer
                conf = {
                    "bootstrap.servers": bootstrap_servers,
                }
                if api_key and api_secret:
                    conf.update({
                        "security.protocol": "SASL_SSL",
                        "sasl.mechanisms": "PLAIN",
                        "sasl.username": api_key,
                        "sasl.password": api_secret,
                    })
                self._kafka_producer = Producer(conf)
                self._is_confluent_connected = True
                logger.info(f"Confluent Kafka Producer initialized for {bootstrap_servers}")
            except Exception as e:
                logger.warning(f"Failed to initialize confluent-kafka client, using in-memory mesh: {e}")

    @property
    def is_confluent_connected(self) -> bool:
        return self._is_confluent_connected

    def subscribe(self, topic: str, handler: Callable[[Any], Any]):
        if topic not in self._subscribers:
            self._subscribers[topic] = []
        self._subscribers[topic].append(handler)
        logger.info(f"Subscribed handler to topic: {topic}")

    async def publish(self, topic: str, payload: Any):
        # Convert payload to serializable dict if needed
        data = payload
        if hasattr(payload, "model_dump"):
            data = payload.model_dump()
        elif hasattr(payload, "dict"):
            data = payload.dict()

        record = {
            "topic": topic,
            "payload": data,
            "confluent_replicated": self._is_confluent_connected,
        }
        self._events_log.append(record)
        logger.info(f"Published event on topic '{topic}' (Confluent: {self._is_confluent_connected})")

        # Produce to remote Kafka if connected
        if self._is_confluent_connected and self._kafka_producer:
            try:
                serialized = json.dumps(data).encode("utf-8")
                self._kafka_producer.produce(topic, value=serialized)
                self._kafka_producer.poll(0)
            except Exception as e:
                logger.error(f"Error publishing to Confluent Kafka topic {topic}: {e}")

        # Dispatch to in-process subscribers & WebSocket push handlers
        if topic in self._subscribers:
            for handler in self._subscribers[topic]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(data)
                    else:
                        handler(data)
                except Exception as e:
                    logger.error(f"Error executing subscriber for topic {topic}: {e}")

    def get_events(self, topic: Optional[str] = None) -> List[Dict[str, Any]]:
        if topic:
            return [e for e in self._events_log if e["topic"] == topic]
        return self._events_log

# Global Singleton Event Mesh
event_bus = ResilientKafkaBus()
