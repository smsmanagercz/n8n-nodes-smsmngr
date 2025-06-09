# n8n-nodes-smsmngr

Community package providing **SmsMngr** action and trigger nodes for n8n.

* Send WhatsApp text, WhatsApp template, or SMS messages.
* Choose callback strategy: manual URL or any *SmsMngr Trigger* in the same workflow.
* Trigger node receives batched webhooks (array of 1‑100 records) and emits one
  n8n item per record.

See the `/nodes/SmsMngr/*.ts` files for full implementation.
