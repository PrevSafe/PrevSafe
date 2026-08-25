import datetime
from typing import Dict, List, Any, Optional

# ==============================================================================
# SST LINTER VALIDATOR ENGINE - CORE ENGINE
# Reference: eSocial Version S-1.3 (Consolidated NT 06/2026) & NR-1 / NR-7 / NR-9
# ==============================================================================

class SSTLinterValidator:
    """
    Core engine responsible for executing cross-referential data validation
    between Human Resources (S-1200 / S-2206 / S-2230), Safety (S-2240),
    and Health (S-2220) events prior to eSocial submission.
    """

    def __init__(self, mapping_db: Optional[Dict[str, List[str]]] = None):
        # Default relational mapping: Tabela 24 (Risk Codes) -> Tabela 27 (Exam Codes)
        # Grounded in NR-7 (PCMSO) guidelines
        # Códigos oficiais da Tabela 24/27 (não os ilustrativos do PDF de
        # referência) — os mesmos usados em riscos_exames_compatibilidade
        # após a correção aplicada em 20260901010000/20260901020000 e
        # 20260903070000.
        self.t24_to_t27_map = mapping_db or {
            "02.01.001": ["0281"],  # Ruído -> Audiometria Tonal Ocupacional
            "02.01.014": ["0295"],  # Calor -> Avaliação Clínica Ocupacional
            "01.08.001": ["0385", "0095"],  # Chumbo -> Chumbo Sanguíneo & ALA-U
            "01.18.001": ["1078", "1057"],  # Sílica Livre Cristalina -> RX Tórax OIT & Espirometria
            "01.03.001": ["0693"],  # Benzeno -> Hemograma c/ Contagem de Plaquetas
            "02.01.006": ["0693"],  # Radiações Ionizantes -> Hemograma c/ Contagem de Plaquetas
            "01.06.001": ["0352"],  # Cádmio -> Cádmio Urinário
        }

        # Fundamentação legal por risco T24, conforme a Matriz de Compatibilidade
        # eSocial (S-1.3 / NR-7) — mesma fonte usada para semear
        # riscos_exames_compatibilidade.referencia_legal no banco.
        self.t24_legal_reference = {
            "02.01.001": "NR-7 Anexo II",
            "02.01.014": "Corpo da NR-7",
            "01.08.001": "NR-7 Anexo I Q2",
            "01.18.001": "NR-7 Anexo III",
            "01.03.001": "NR-7 Anexo V",
            "02.01.006": "NR-7 Anexo V",
            "01.06.001": "NR-7 Anexo I Q2",
        }

    def validate_all(self, worker_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes all Linter Rules against a worker's structured payload.
        """
        alerts = []
        
        # Rule 1 & 5: S-2240 (Risks & EPI) vs S-2220 (ASO & Exams)
        alerts.extend(self._validate_risks_and_exams(worker_payload))
        
        # Rule 2: S-2240 (LTCAT) vs S-1200 (Payroll Tax Code)
        alerts.extend(self._validate_tax_alignment(worker_payload))
        
        # Rule 3: S-2230 (Leave) vs S-2210 (CAT)
        alerts.extend(self._validate_leave_vs_cat(worker_payload))
        
        # Rule 4: S-2206 (Role Change) vs S-2240 (Risk History)
        alerts.extend(self._validate_cronology_and_roles(worker_payload))

        has_blocking_error = any(alert["severity"] == "HARD_BLOCK" for alert in alerts)

        return {
            "status": "FAILED_AUDIT" if has_blocking_error else "PASSED",
            "total_alerts": len(alerts),
            "alerts": alerts,
            "timestamp": datetime.datetime.now().isoformat()
        }

    def _validate_risks_and_exams(self, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        alerts = []
        worker = payload.get("worker", {})
        s2240 = payload.get("s2240", {})
        s2220 = payload.get("s2220", {})

        active_risks = s2240.get("risks", [])
        completed_exams = {exam.get("code") for exam in s2220.get("exams", [])}

        for risk in active_risks:
            risk_code = risk.get("code")
            risk_name = risk.get("name", "Risco não identificado")
            
            # --- Rule 5: EPI Data Validation ---
            if risk_code == "09.01.001":  # No risk
                if s2240.get("epi_active") or s2240.get("epc_active"):
                    alerts.append({
                        "id": "LNT-S2240-003",
                        "severity": "HARD_BLOCK",
                        "title": "Ausência de Risco com EPI/EPC Preenchido",
                        "affected_worker": worker,
                        "message": (
                            f"O preenchimento do S-2240 para {worker.get('name')} indica ausência de riscos (09.01.001), "
                            "mas contém dados de Equipamentos de Proteção (EPI/EPC). O eSocial rejeitará o XML por erro de estrutura."
                        ),
                        "resolution": "Se o trabalhador não está exposto, remova os dados de EPI/EPC. Se necessita de proteção, vincule o risco correto."
                    })
            else:
                if risk.get("uses_epi") and not risk.get("ca_number"):
                    alerts.append({
                        "id": "LNT-S2240-EPI-MISSING",
                        "severity": "HARD_BLOCK",
                        "title": "Dados de EPI Incompletos no S-2240",
                        "affected_worker": worker,
                        "message": (
                            f"O evento S-2240 para o risco {risk_name} ({risk_code}) indica uso de EPI, "
                            "mas o número do Certificado de Aprovação (CA) não foi informado."
                        ),
                        "resolution": "Informe um número de CA de EPI válido e preencha os parâmetros de eficácia da NR-6."
                    })

            # --- Rule 1: Cross-referential Risk vs Exam ---
            if risk_code in self.t24_to_t27_map:
                required_exams = self.t24_to_t27_map[risk_code]
                for req_exam in required_exams:
                    if req_exam not in completed_exams:
                        alerts.append({
                            "id": "LNT-S2240-001",
                            "severity": "HARD_BLOCK",
                            "title": "Exposição a Risco sem Monitoramento de Saúde no PCMSO",
                            "affected_worker": worker,
                            "legal_reference": self.t24_legal_reference.get(risk_code),
                            "message": (
                                f"O trabalhador {worker.get('name')} está exposto ao risco {risk_name} (Código {risk_code}), "
                                f"mas não realizou o exame periódico obrigatório correspondente (Código {req_exam}) previsto no PCMSO."
                            ),
                            "resolution": (
                                "Acesse o painel do PCMSO, agende e registre a realização do exame "
                                f"complementar correspondente (Código {req_exam}) antes de enviar o evento S-2220."
                            )
                        })
        return alerts

    def _validate_tax_alignment(self, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        alerts = []
        worker = payload.get("worker", {})
        s2240 = payload.get("s2240", {})
        s1200 = payload.get("s1200", {})

        # Check if any risk has special retirement flag active (LTCAT)
        has_special_retirement = any(risk.get("enseja_aposentadoria_especial") for risk in s2240.get("risks", []))
        payroll_tax_code = s1200.get("infoAgNocivo", "1")

        if has_special_retirement and payroll_tax_code == "1":
            alerts.append({
                "id": "LNT-S1200-001",
                "severity": "WARNING_ADVISORY",
                "title": "Divergência Tributária de Aposentadoria Especial",
                "affected_worker": worker,
                "message": (
                    f"O LTCAT de {worker.get('name')} caracteriza exposição que enseja Aposentadoria Especial, "
                    "mas o evento S-1200 da folha de pagamento indica código '1' (Ausência de exposição/Não recolhimento)."
                ),
                "resolution": (
                    "Solicite ao setor de Departamento Pessoal a retificação do S-1200 para parametrizar "
                    "corretamente o recolhimento da alíquota suplementar de SAT/FENTEC."
                )
            })
        return alerts

    def _validate_leave_vs_cat(self, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        alerts = []
        worker = payload.get("worker", {})
        s2230 = payload.get("s2230", {})
        s2210 = payload.get("s2210", {})

        # Code '01' or '03' in Tabela 18 represents work accidents / occupational disease
        is_accident_leave = s2230.get("reason_code") in ["01", "03"]
        has_cat = s2210.get("cat_issued", False)

        if is_accident_leave and not has_cat:
            alerts.append({
                "id": "LNT-S2210-001",
                "severity": "WARNING_ADVISORY",
                "title": "Afastamento Acidentário Cadastrado sem CAT Transmitida",
                "affected_worker": worker,
                "message": (
                    f"O trabalhador {worker.get('name')} foi afastado sob motivo acidentário (S-2230), "
                    "mas nenhuma Comunicação de Acidente de Trabalho (S-2210) foi transmitida dentro do prazo legal."
                ),
                "resolution": (
                    "Acesse o módulo de mensageria, clique em 'Emitir CAT (S-2210)' para o trabalhador afetado, "
                    "preencha as informações do acidente e realize o envio imediato."
                )
            })
        return alerts

    def _validate_cronology_and_roles(self, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        alerts = []
        worker = payload.get("worker", {})
        s2206 = payload.get("s2206", {})
        s2240 = payload.get("s2240", {})

        role_change_date = s2206.get("change_date")
        s2240_start_date = s2240.get("start_date")

        if role_change_date and s2240_start_date:
            if role_change_date != s2240_start_date:
                alerts.append({
                    "id": "LNT-S2240-002",
                    "severity": "HARD_BLOCK",
                    "title": "Quebra de Cronologia no PPP Eletrônico",
                    "affected_worker": worker,
                    "message": (
                        f"O RH registrou alteração contratual (S-2206) para o trabalhador {worker.get('name')} em {role_change_date}, "
                        f"mas a data de início de exposição ambiental do S-2240 está cadastrada como {s2240_start_date}."
                    ),
                    "resolution": (
                        f"Ajuste a 'Data de Início da Condição' do evento S-2240 para {role_change_date} "
                        "para que o histórico de exposição do PPP seja contínuo e sem lacunas temporais."
                    )
                })
        return alerts

# ==============================================================================
# DEMO EXECUTION / UNIT TESTING
# ==============================================================================

if __name__ == "__main__":
    # Simulate a payload containing structural data inconsistencies for validation
    mock_payload = {
        "worker": {
            "name": "Carlos Henrique da Silva",
            "cpf": "123.456.789-00",
            "registration": "MTR-2024-001"
        },
        "s2206": {
            "change_date": "2026-08-01"
        },
        "s2240": {
            "start_date": "2026-08-10",  # S-2240 and S-2206 date mismatch! (Trigger LNT-S2240-002)
            "epi_active": False,
            "epc_active": False,
            "risks": [
                {
                    "code": "02.01.001",  # Ruído Ocupacional. Requires Audiometria (Cód. 0281)
                    "name": "Ruído Contínuo ou Intermitente",
                    "uses_epi": True,
                    "ca_number": "",  # EPI CA number is missing! (Trigger LNT-S2240-EPI-MISSING)
                    "enseja_aposentadoria_especial": True # Trigger Special retirement warning (Trigger LNT-S1200-001)
                }
            ]
        },
        "s2220": {
            "exams": [
                {
                    "code": "0295",  # Clinic Exam (ASO) but lacks Audiometria! (Trigger LNT-S2240-001)
                    "date": "2026-08-05"
                }
            ]
        },
        "s1200": {
            "infoAgNocivo": "1"  # Declared as 'No exposure' on payroll, conflicts with s2240!
        },
        "s2230": {
            "reason_code": "01"  # Work Accident leave
        },
        "s2210": {
            "cat_issued": False  # Missing CAT! (Trigger LNT-S2210-001)
        }
    }

    # Run the validation
    validator = SSTLinterValidator()
    result = validator.validate_all(mock_payload)

    print("\n" + "="*80)
    print(f"SST LINTER AUDIT RUN | STATUS: {result['status']} | TOTAL ALERTS: {result['total_alerts']}")
    print("="*80 + "\n")

    for idx, alert in enumerate(result["alerts"], 1):
        print(f"[{idx}] SEVERIDADE: {alert['severity']}")
        print(f"    ALERTA: {alert['title']} ({alert['id']})")
        print(f"    MENSAGEM: {alert['message']}")
        print(f"    COMO RESOLVER: {alert['resolution']}")
        print("-" * 80)
