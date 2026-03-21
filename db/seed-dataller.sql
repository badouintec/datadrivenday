-- Update presentation record
UPDATE presentations SET
  nombre = 'Dataller de IA 2026',
  slug = 'dataller-2026',
  token = 'dataller2026',
  descripcion = 'Data Driven Day · 28 de marzo · Design Thinking Lab, Tec Sonora Norte',
  estado = 'publicada',
  pagina_url = '/dataller'
WHERE id = (SELECT id FROM presentations LIMIT 1);

-- Insert if none exists
INSERT OR IGNORE INTO presentations (id, nombre, slug, token, descripcion, estado, pagina_url)
VALUES ('pres-dataller-2026', 'Dataller de IA 2026', 'dataller-2026', 'dataller2026',
  'Data Driven Day · 28 de marzo · Design Thinking Lab, Tec Sonora Norte', 'publicada', '/dataller');

-- Clear existing slides for this presentation
DELETE FROM presentation_slides WHERE presentacion IN ('dataller-2026', 'pres-dataller-2026');

-- SLIDE 00 — BIENVENIDA
INSERT INTO presentation_slides (id, presentacion, numero, tag, titulo, subtitulo, cuerpo, notas, duracion, particle_state, accent_color, chord_json, particle_speed, command_words_json, referencias_json, codigo_demo, conceptos_json, is_active)
VALUES (
  'slide-00-bienvenida', 'pres-dataller-2026', 0,
  '8:30 AM · REGISTRO',
  'Dataller de IA 2026',
  'Data Driven Day · Hermosillo, Sonora',
  'Bienvenidos al Design Thinking Lab. Trae tu laptop, esto va a ser práctico.',
  'Dar tiempo al registro. Verificar wifi. Pedir a todos que abran datadrivenday.mx/dataller en su dispositivo.',
  10, 'expand', 'primary',
  '[130.81, 196.00, 261.63]', 0.02,
  '["comenzamos", "empezamos", "iniciamos", "siguiente"]',
  '[]', NULL,
  '["IA aplicada", "Hermosillo", "Datos y ciudad"]',
  1
);

-- SLIDE 01 — POR QUÉ IMPORTA
INSERT INTO presentation_slides (id, presentacion, numero, tag, titulo, subtitulo, cuerpo, notas, duracion, particle_state, accent_color, chord_json, particle_speed, command_words_json, referencias_json, codigo_demo, conceptos_json, is_active)
VALUES (
  'slide-01-contexto', 'pres-dataller-2026', 1,
  '9:00 AM · CONTEXTO',
  'Por qué esto importa aquí',
  'Hermosillo vs. el estado del arte',
  'La economía de Hermosillo creció más lento que Querétaro, Saltillo y Tijuana. Sus tres mayores frenos son agua, vivienda y transporte. Los datos y la IA son herramientas, no magia.',
  'Conectar el taller con el informe Harvard. Mostrar que no somos un taller genérico de IA — somos un taller sobre IA aplicada a los problemas reales de esta ciudad.',
  10, 'chaos', 'alert',
  '[146.83, 196.00, 261.63]', 0.035,
  '["hermosillo", "ciudad", "datos", "problema"]',
  '[{"titulo":"Hermosillo con futuro: cómo podemos acelerar su crecimiento","fuente":"Growth Lab · Harvard Kennedy School · Hermosillo ¿Cómo Vamos?","anio":"2025","url":"https://growthlab.hks.harvard.edu/policy-research/economic-growth-strategies-hermosillo","tipo":"informe"}]',
  NULL,
  '["Complejidad económica", "Cuellos de botella", "Nearshoring"]',
  1
);

-- SLIDE 02 — QUÉ ES LA IA HOY
INSERT INTO presentation_slides (id, presentacion, numero, tag, titulo, subtitulo, cuerpo, notas, duracion, particle_state, accent_color, chord_json, particle_speed, command_words_json, referencias_json, codigo_demo, conceptos_json, is_active)
VALUES (
  'slide-02-ia-hoy', 'pres-dataller-2026', 2,
  '9:10 AM · FUNDAMENTOS',
  'IA en 2026: qué cambió',
  'Del fine-tuning al In-Context Learning',
  'El paradigma cambió. Ya no entrenamos modelos por tarea. Los foundation models aprenden de contexto. TabPFN-2.5 supera a XGBoost sin entrenamiento específico.',
  'Explicar ICL con una analogía: antes le enseñabas a un estudiante un tema específico. Ahora el modelo ya sabe leer y aprender de ejemplos al vuelo.',
  15, 'helix', 'primary',
  '[174.61, 220.00, 293.66]', 0.04,
  '["modelos", "aprendizaje", "contexto", "tabular", "xgboost"]',
  '[{"titulo":"TabPFN-2.5: Advancing the State of the Art in Tabular Foundation Models","fuente":"arXiv:2511.08667","anio":"2026","url":"https://arxiv.org/abs/2511.08667","tipo":"paper"},{"titulo":"TabICLv2: A better, faster, scalable, and open tabular foundation model","fuente":"arXiv:2602.11139","anio":"2026","url":"https://arxiv.org/abs/2602.11139","tipo":"paper"}]',
  'from tabpfn import TabPFNClassifier
import numpy as np

# Sin entrenamiento previo por tarea
clf = TabPFNClassifier()
clf.fit(X_train, y_train)          # segundos, no horas
predictions = clf.predict(X_test)  # inferencia bayesiana aproximada',
  '["Foundation Models", "In-Context Learning", "TabPFN", "Inferencia bayesiana"]',
  1
);

-- SLIDE 03 — RAG Y KNOWLEDGE RUNTIMES
INSERT INTO presentation_slides (id, presentacion, numero, tag, titulo, subtitulo, cuerpo, notas, duracion, particle_state, accent_color, chord_json, particle_speed, command_words_json, referencias_json, codigo_demo, conceptos_json, is_active)
VALUES (
  'slide-03-rag', 'pres-dataller-2026', 3,
  '9:25 AM · ARQUITECTURA',
  'De RAG simple a Knowledge Runtimes',
  'Cómo los sistemas buscan y razonan',
  'El RAG de 2023 era búsqueda vectorial básica. En 2026 los sistemas razonan en múltiples saltos: GraphRAG supera la búsqueda vectorial simple en 3.4x en análisis de relaciones complejas.',
  'Demo en vivo: construir un RAG simple que consulta el informe Harvard sobre Hermosillo. Los asistentes pueden preguntar al sistema sobre los datos de la ciudad.',
  20, 'network', 'sage',
  '[196.00, 261.63, 329.63]', 0.05,
  '["rag", "vectorial", "grafos", "conocimiento", "recuperación"]',
  '[{"titulo":"Best Vector Database for RAG (2026 Guide)","fuente":"TiDB / PingCAP","anio":"2026","url":"https://www.pingcap.com/compare/best-vector-database/","tipo":"informe"},{"titulo":"The Next Frontier of RAG: How Enterprise Knowledge Systems Will Evolve 2026-2030","fuente":"NStarX","anio":"2026","url":"https://nstarxinc.com/blog/the-next-frontier-of-rag-how-enterprise-knowledge-systems-will-evolve-2026-2030/","tipo":"informe"}]',
  'from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

# Indexar el informe Harvard sobre Hermosillo
vectorstore = Chroma.from_documents(
    documents=hermosillo_docs,
    embedding=OpenAIEmbeddings()
)

# Preguntar al documento
retriever = vectorstore.as_retriever(k=4)
response = qa_chain.invoke("¿Cuáles son los cuellos de botella de Hermosillo?")',
  '["RAG", "GraphRAG", "Embeddings", "Vector search", "LangChain"]',
  1
);

-- SLIDE 04 — VIBE CODING Y AGENTES
INSERT INTO presentation_slides (id, presentacion, numero, tag, titulo, subtitulo, cuerpo, notas, duracion, particle_state, accent_color, chord_json, particle_speed, command_words_json, referencias_json, codigo_demo, conceptos_json, is_active)
VALUES (
  'slide-04-agentes', 'pres-dataller-2026', 4,
  '9:45 AM · DESARROLLO',
  'Vibe Coding y ecosistema de agentes',
  'GitHub Copilot · Cursor · Claude Code · MCP',
  'El desarrollador ya no escribe todo. Guía la arquitectura en lenguaje natural. El Model Context Protocol conecta los LLMs con repositorios, bases de datos y herramientas locales de forma segura.',
  'Demo en vivo con Cursor o Claude Code. Mostrar cómo se construye un endpoint de Hono pidiéndolo en lenguaje natural. Enfatizar que el criterio técnico del humano sigue siendo crítico.',
  20, 'orbit', 'primary',
  '[220.00, 293.66, 369.99]', 0.03,
  '["cursor", "copilot", "agente", "protocolo", "mcp", "claude"]',
  '[{"titulo":"Model Context Protocol — Documentación oficial","fuente":"Anthropic","anio":"2025","url":"https://modelcontextprotocol.io/introduction","tipo":"herramienta"},{"titulo":"GitHub Copilot Docs","fuente":"GitHub","anio":"2026","url":"https://docs.github.com/en/copilot","tipo":"herramienta"},{"titulo":"Claude Code","fuente":"Anthropic","anio":"2026","url":"https://docs.anthropic.com/en/docs/claude-code/overview","tipo":"herramienta"}]',
  '// Le pedimos a Claude Code:
// "Crea un endpoint en Hono que reciba un nombre y email
//  y los inserte en D1 validando que el email sea único"

app.post(''/api/submissions'', async (c) => {
  const { name, email, organization } = await c.req.json();
  const db = c.env.DB;
  const exists = await db
    .prepare(''SELECT id FROM submissions WHERE email = ?'')
    .bind(email.toLowerCase()).first();
  if (exists) return c.json({ ok: false, error: ''email_exists'' }, 409);
  // ...
});',
  '["Vibe Coding", "MCP", "Agentes", "Cursor", "Claude Code"]',
  1
);

-- SLIDE 05 — INTEGRACIÓN Y DESPLIEGUE
INSERT INTO presentation_slides (id, presentacion, numero, tag, titulo, subtitulo, cuerpo, notas, duracion, particle_state, accent_color, chord_json, particle_speed, command_words_json, referencias_json, codigo_demo, conceptos_json, is_active)
VALUES (
  'slide-05-deploy', 'pres-dataller-2026', 5,
  '10:05 AM · INTEGRACIÓN',
  'De la notebook al producto',
  'FastAPI · Cloudflare Workers · Hono',
  'Un modelo que solo vive en una Jupyter notebook no es un producto. Aprender a exponer modelos como APIs, desplegarlos en edge computing y monitorearlos en producción.',
  'Mostrar el stack del propio sitio como ejemplo. Este sitio (datadrivenday.mx) corre en Cloudflare Workers con Hono. Es exactamente el tipo de despliegue que vamos a ver.',
  15, 'flow', 'sage',
  '[174.61, 246.94, 329.63]', 0.04,
  '["api", "fastapi", "cloudflare", "workers", "deploy", "producción"]',
  '[{"titulo":"FastAPI — Documentación oficial","fuente":"Sebastián Ramírez","anio":"2026","url":"https://fastapi.tiangolo.com","tipo":"herramienta"},{"titulo":"Cloudflare Workers — Edge compute","fuente":"Cloudflare","anio":"2026","url":"https://workers.cloudflare.com","tipo":"herramienta"},{"titulo":"Hono — Lightweight web framework for the Edge","fuente":"Yusuke Wada","anio":"2026","url":"https://hono.dev","tipo":"herramienta"}]',
  '# FastAPI: exponer un modelo de ML como API
from fastapi import FastAPI
from pydantic import BaseModel
import joblib

app = FastAPI()
model = joblib.load("modelo_agua_hermosillo.pkl")

class InputData(BaseModel):
    extraccion_litros: float
    mes: int
    zona: str

@app.post("/predecir-estres-hidrico")
def predecir(data: InputData):
    features = preparar_features(data)
    prob = model.predict_proba([features])[0][1]
    return {"probabilidad_estres": round(prob, 3)}',
  '["FastAPI", "Edge computing", "Serverless", "API REST", "MLOps"]',
  1
);

-- SLIDE 06 — GOBERNANZA Y XAI
INSERT INTO presentation_slides (id, presentacion, numero, tag, titulo, subtitulo, cuerpo, notas, duracion, particle_state, accent_color, chord_json, particle_speed, command_words_json, referencias_json, codigo_demo, conceptos_json, is_active)
VALUES (
  'slide-06-gobernanza', 'pres-dataller-2026', 6,
  '10:20 AM · RESPONSABILIDAD',
  'Explicabilidad y gobernanza',
  'Ley de IA EU · Federated Learning · SHAP',
  'Con la Ley de IA de la UE vigente desde agosto de 2026, la explicabilidad es un mandato legal. Saber por qué un modelo tomó una decisión ya no es opcional.',
  'Conectar con el contexto local: si un modelo decide cómo asignar concesiones de agua en Hermosillo, ¿quién puede auditar esa decisión? La transparencia no es solo ética — es política pública.',
  10, 'grid', 'alert',
  '[130.81, 196.00, 261.63, 329.63]', 0.025,
  '["explicabilidad", "xai", "shap", "transparencia", "auditoría", "ley"]',
  '[{"titulo":"Interpretable Machine Learning","fuente":"Christoph Molnar","anio":"2022","url":"https://christophm.github.io/interpretable-ml-book/","tipo":"libro"},{"titulo":"EU AI Act — Texto completo","fuente":"Unión Europea","anio":"2024","url":"https://artificialintelligenceact.eu/the-act/","tipo":"informe"},{"titulo":"What is Explainable AI (XAI)?","fuente":"IBM","anio":"2026","url":"https://www.ibm.com/think/topics/explainable-ai","tipo":"informe"}]',
  'import shap

# Explicar predicciones del modelo de estrés hídrico
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)

# ¿Por qué esta zona tiene alto riesgo?
shap.force_plot(
    explainer.expected_value,
    shap_values[0],
    X_test.iloc[0],
    feature_names=[''extraccion'', ''mes'', ''zona'']
)',
  '["SHAP", "LIME", "XAI", "EU AI Act", "Federated Learning"]',
  1
);

-- SLIDE 07 — PRESENTACIÓN DE PROYECTOS
INSERT INTO presentation_slides (id, presentacion, numero, tag, titulo, subtitulo, cuerpo, notas, duracion, particle_state, accent_color, chord_json, particle_speed, command_words_json, referencias_json, codigo_demo, conceptos_json, is_active)
VALUES (
  'slide-07-proyectos', 'pres-dataller-2026', 7,
  '11:00 AM · PROYECTOS',
  'Muéstranos en qué estás trabajando',
  'Revisión entre pares · sin presión',
  'Si tienes algo en construcción — aunque esté incompleto — tienes 5 minutos para mostrarlo. ¿Qué decidiste construir? ¿Qué no funcionó? ¿Qué retroalimentación necesitas?',
  'Abrir la sesión de proyectos. No es un pitch. No hay investor. Es una revisión técnica entre personas que están haciendo cosas parecidas. El único requisito: tener algo real que mostrar.',
  60, 'cluster', 'light',
  '[220.00, 329.63, 392.00]', 0.015,
  '["proyecto", "demostración", "siguiente proyecto", "gracias"]',
  '[]', NULL,
  '["Demo", "Revisión técnica", "Comunidad"]',
  1
);

-- SLIDE 08 — CIERRE
INSERT INTO presentation_slides (id, presentacion, numero, tag, titulo, subtitulo, cuerpo, notas, duracion, particle_state, accent_color, chord_json, particle_speed, command_words_json, referencias_json, codigo_demo, conceptos_json, is_active)
VALUES (
  'slide-08-cierre', 'pres-dataller-2026', 8,
  '2:30 PM · CIERRE',
  'Lo que sigue',
  'Recursos, comunidad y el siguiente paso',
  'El Dataller no termina aquí. Los recursos están en datadrivenday.mx/dataller. La comunidad sigue en el chat. El siguiente evento del Data Driven Day es el 18 de septiembre.',
  'Recordar que el sitio tiene todos los recursos. Invitar a conectar. Mencionar el evento de septiembre. Agradecer al Tec de Monterrey por el espacio.',
  30, 'pulse', 'primary',
  '[196.00, 261.63, 329.63, 392.00, 523.25]', 0.02,
  '["gracias", "cierre", "hasta", "septiembre"]',
  '[{"titulo":"Data Driven Day 2026 — Recursos completos","fuente":"datadrivenday.mx","anio":"2026","url":"https://datadrivenday.mx/datos","tipo":"informe"}]',
  NULL,
  '["Data Driven Day", "Septiembre 2026", "Comunidad Hermosillo"]',
  1
);
