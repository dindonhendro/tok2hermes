"""
Vercel Python Serverless Function Entrypoint for Hermes Engine & Excel Control Panel Audit
"""
from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response_data = {
            "status": "active",
            "system": "Toktok Health KORPRI Hermes Automation Engine",
            "message": "Hermes API Endpoint Operational",
            "supported_endpoints": ["/api/audit-excel", "/api/webhook"]
        }
        
        self.wfile.write(json.dumps(response_data).encode('utf-8'))
        return

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
        
        try:
            payload = json.loads(post_data.decode('utf-8'))
        except Exception:
            payload = {}

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        file_id = payload.get('file_id', 'unknown')
        filename = payload.get('filename', 'collective_registration.xlsx')
        
        response_data = {
            "status": "success",
            "message": f"Hermes Agent (Kabayan) triggered audit for file '{filename}' (ID: {file_id})",
            "engine": "Hermes Audit Engine v2.6",
            "payload_received": payload
        }
        
        self.wfile.write(json.dumps(response_data).encode('utf-8'))
        return
