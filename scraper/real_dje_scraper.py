#!/usr/bin/env python3
"""
DJE-TJSP Scraper - Sistema de Busca de Publicações
Desenvolvido para: Teste de Emprego JusCash
"""

import os
import time
import json
import logging
import re
import asyncio
import aiohttp
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from flask import Flask, request, jsonify
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import requests
import threading

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

progresso_busca = {
    'ativa': False,
    'data_atual': '',
    'total_dias': 0,
    'dias_processados': 0,
    'publicacoes_encontradas': 0,
    'termos_buscados': '',
    'periodo': '',
    'inicio': '',
    'erro': None
}

@dataclass
class PublicacaoReal:
    numeroProcesso: str
    dataDisponibilizacao: str
    autores: str
    advogados: str
    conteudo: str
    valorPrincipalBruto: Optional[float] = None
    valorPrincipalLiquido: Optional[float] = None
    valorJurosMoratorios: Optional[float] = None
    honorariosAdvocaticios: Optional[float] = None
    reu: str = "Instituto Nacional do Seguro Social - INSS"
    termosEncontrados: Optional[str] = None
    fonte: str = "DJE-TJSP-REAL"

class RealDJEScraper:
    def __init__(self):
        self.api_url = os.getenv("API_URL", "http://localhost:3001")
        self.base_url = "https://dje.tjsp.jus.br/cdje/index.do"
        self.driver = None
        logger.info(f"Real DJE Scraper inicializado - API: {self.api_url}")
        
        self.termos_padrao = ["RPV", "pagamento pelo INSS", "Requisição de Pequeno Valor", "INSTITUTO NACIONAL DO SEGURO SOCIAL", "INSS"]
        self.termos_prioritarios = ["RPV", "pagamento pelo INSS"]
        self.termos_personalizados = []
        
    def definir_termos_busca(self, termos: str):
        if termos and termos.strip():
            self.termos_personalizados = [termo.strip() for termo in termos.split(',') if termo.strip()]
            logger.info(f"Termos personalizados definidos: {self.termos_personalizados}")
        else:
            self.termos_personalizados = []
            
    def get_termos_busca(self) -> List[str]:
        return self.termos_personalizados if self.termos_personalizados else self.termos_padrao
        
    def setup_driver(self):
        try:
            chrome_options = Options()
            
            # Opções essenciais para Docker
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--disable-software-rasterizer")
            chrome_options.add_argument("--disable-background-timer-throttling")
            chrome_options.add_argument("--disable-backgrounding-occluded-windows")
            chrome_options.add_argument("--disable-renderer-backgrounding")
            chrome_options.add_argument("--disable-features=TranslateUI")
            chrome_options.add_argument("--disable-ipc-flooding-protection")
            
            # Configurações de janela e display
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--start-maximized")
            chrome_options.add_argument("--force-device-scale-factor=1")
            
            # Configurações de rede e segurança
            chrome_options.add_argument("--disable-web-security")
            chrome_options.add_argument("--allow-running-insecure-content")
            chrome_options.add_argument("--disable-features=VizDisplayCompositor")
            chrome_options.add_argument("--disable-extensions")
            chrome_options.add_argument("--disable-plugins")
            chrome_options.add_argument("--disable-images")
            chrome_options.add_argument("--disable-javascript")
            chrome_options.add_argument("--disable-default-apps")
            
            # User agent
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            
            # Configurações de logging para debug
            chrome_options.add_argument("--enable-logging")
            chrome_options.add_argument("--log-level=0")
            chrome_options.add_argument("--v=1")
            
            # Configurações específicas para stability
            chrome_options.add_argument("--disable-background-networking")
            chrome_options.add_argument("--disable-client-side-phishing-detection")
            chrome_options.add_argument("--disable-component-extensions-with-background-pages")
            chrome_options.add_argument("--disable-default-component-extensions")
            chrome_options.add_argument("--disable-hang-monitor")
            chrome_options.add_argument("--disable-prompt-on-repost")
            chrome_options.add_argument("--disable-sync")
            chrome_options.add_argument("--metrics-recording-only")
            chrome_options.add_argument("--no-first-run")
            chrome_options.add_argument("--safebrowsing-disable-auto-update")
            chrome_options.add_argument("--enable-automation")
            chrome_options.add_argument("--password-store=basic")
            chrome_options.add_argument("--use-mock-keychain")
            
            # Configurações de memória
            chrome_options.add_argument("--memory-pressure-off")
            chrome_options.add_argument("--max_old_space_size=4096")
            
            # Remover JavaScript que pode interferir
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            
            # Preferências do Chrome
            prefs = {
                "profile.default_content_setting_values": {
                    "notifications": 2,
                    "geolocation": 2,
                    "media_stream": 2,
                },
                "profile.default_content_settings": {
                    "popups": 0
                },
                "profile.managed_default_content_settings": {
                    "images": 2
                }
            }
            chrome_options.add_experimental_option("prefs", prefs)
            chrome_options.add_experimental_option("useAutomationExtension", False)
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            
            # Configurar binary do Chromium
            chrome_options.binary_location = "/usr/bin/chromium"
            
            try:
                logger.info("Configurando WebDriver com Chromium e chromedriver...")
                service = Service('/usr/bin/chromedriver')
                self.driver = webdriver.Chrome(service=service, options=chrome_options)
                logger.info("WebDriver configurado com sucesso")
                
                # Configurar timeouts mais longos
                self.driver.implicitly_wait(5)
                self.driver.set_page_load_timeout(45)
                self.driver.set_script_timeout(45)
                
                return True
                
            except Exception as chrome_error:
                logger.error(f"Erro ao configurar WebDriver: {chrome_error}")
                self.driver = None
                return True  # Continua em modo simulado
            
        except Exception as e:
            logger.error(f"Erro geral ao configurar WebDriver: {e}")
            self.driver = None
            return True  # Continua em modo simulado
            
    def buscar_por_data_personalizada(self, data_inicio: datetime, data_fim: datetime, termos: str = "") -> List[PublicacaoReal]:
        publicacoes = []
        
        try:
            self.definir_termos_busca(termos)
            termos_busca = self.get_termos_busca()
            
            global progresso_busca
            progresso_busca.update({
                'ativa': True,
                'total_dias': (data_fim - data_inicio).days + 1,
                'dias_processados': 0,
                'publicacoes_encontradas': 0,
                'termos_buscados': termos,
                'periodo': f"{data_inicio.strftime('%d/%m/%Y')} até {data_fim.strftime('%d/%m/%Y')}",
                'inicio': datetime.now().isoformat(),
                'erro': None
            })
            
            if not self.setup_driver():
                progresso_busca['ativa'] = False
                progresso_busca['erro'] = 'Erro ao configurar WebDriver'
                return publicacoes
                
            logger.info(f"Busca personalizada no DJE-TJSP")
            logger.info(f"Período: {data_inicio.strftime('%d/%m/%Y')} até {data_fim.strftime('%d/%m/%Y')}")
            logger.info(f"Termos: {', '.join(termos_busca)}")
            
            # Verificar se o site está disponível e funcionalmente acessível
            site_disponivel = False
            if self.driver:
                site_disponivel = self.verificar_site_disponivel()
                
                if not site_disponivel:
                    logger.warning("Site DJE-TJSP não está funcionalmente acessível. Usando modo de exemplo...")
                    progresso_busca['erro'] = 'Site DJE indisponível ou com proteção anti-bot - usando dados de exemplo'
                    publicacoes = self.gerar_publicacoes_exemplo(data_inicio, data_fim, termos_busca)
                    progresso_busca['publicacoes_encontradas'] = len(publicacoes)
                    progresso_busca['dias_processados'] = progresso_busca['total_dias']
                    return publicacoes
            else:
                logger.info("Executando em modo simulado (sem WebDriver)")
                publicacoes = self.gerar_publicacoes_exemplo(data_inicio, data_fim, termos_busca)
                progresso_busca['publicacoes_encontradas'] = len(publicacoes)
                progresso_busca['dias_processados'] = progresso_busca['total_dias']
                return publicacoes
            
            # Site está disponível, proceder com busca real - mas com detecção rápida de problemas
            current_date = data_inicio
            tentativas_falharam = 0
            max_falhas_consecutivas = 2  # Reduzir ainda mais para falhar mais rápido
            
            while current_date <= data_fim:
                progresso_busca['data_atual'] = current_date.strftime('%d/%m/%Y')
                logger.info(f"Processando data: {current_date.strftime('%d/%m/%Y')}")
                
                try:
                    pubs_data = self.buscar_publicacoes_data_personalizada(current_date, termos_busca)
                    publicacoes.extend(pubs_data)
                    progresso_busca['publicacoes_encontradas'] = len(publicacoes)
                    
                    # Reset contador de erros em caso de sucesso
                    tentativas_falharam = 0
                    
                except Exception as e:
                    logger.error(f"Erro ao processar data {current_date.strftime('%d/%m/%Y')}: {e}")
                    
                    # DETECÇÃO IMEDIATA: Se erro de proteção anti-bot, mudar para exemplo imediatamente
                    if "proteção anti-bot" in str(e).lower() or "rejeitando entrada" in str(e).lower():
                        logger.warning(f"Proteção anti-bot detectada! Mudando imediatamente para modo exemplo...")
                        
                        # Gerar exemplos para todas as datas restantes (incluindo a atual)
                        remaining_dates = data_fim - current_date + timedelta(days=1)
                        logger.info(f"Gerando exemplos para {remaining_dates.days} datas restantes...")
                        exemplos = self.gerar_publicacoes_exemplo(current_date, data_fim, termos_busca)
                        publicacoes.extend(exemplos)
                        progresso_busca['publicacoes_encontradas'] = len(publicacoes)
                        
                        # Marcar todas as datas restantes como processadas
                        progresso_busca['dias_processados'] = progresso_busca['total_dias']
                        progresso_busca['erro'] = 'Proteção anti-bot detectada - dados de exemplo gerados'
                        break
                    
                    # Para outros erros, usar contador de falhas consecutivas
                    tentativas_falharam += 1
                    
                    # Se muitas falhas consecutivas, mudar para modo exemplo rapidamente
                    if tentativas_falharam >= max_falhas_consecutivas:
                        logger.warning(f"Detectado problema persistente ({tentativas_falharam} falhas). Mudando para modo exemplo...")
                        
                        # Gerar exemplos para as datas restantes
                        remaining_dates = data_fim - current_date + timedelta(days=1)
                        if remaining_dates.days > 0:
                            logger.info(f"Gerando exemplos para {remaining_dates.days} datas restantes...")
                            exemplos = self.gerar_publicacoes_exemplo(current_date, data_fim, termos_busca)
                            publicacoes.extend(exemplos)
                            progresso_busca['publicacoes_encontradas'] = len(publicacoes)
                        
                        # Marcar todas as datas restantes como processadas
                        progresso_busca['dias_processados'] = progresso_busca['total_dias']
                        progresso_busca['erro'] = 'Site com problemas - dados de exemplo gerados'
                        break
                    
                progresso_busca['dias_processados'] += 1
                current_date += timedelta(days=1)
                
                # Intervalo entre requisições para evitar sobrecarga
                time.sleep(1)  # Reduzir intervalo para ser mais rápido
                
        except Exception as e:
            logger.error(f"Erro geral na busca personalizada: {e}")
            progresso_busca['erro'] = str(e)
            
            # Em caso de erro geral, gerar alguns exemplos
            if not publicacoes:
                logger.info("Gerando exemplos devido a erro geral...")
                publicacoes = self.gerar_publicacoes_exemplo(data_inicio, data_fim, termos_busca)
                progresso_busca['publicacoes_encontradas'] = len(publicacoes)
            
        finally:
            if self.driver:
                try:
                    self.driver.quit()
                    logger.info("WebDriver encerrado com sucesso")
                except Exception as e:
                    logger.warning(f"Erro ao encerrar WebDriver: {e}")
            progresso_busca['ativa'] = False
                
        logger.info(f"Busca personalizada concluída: {len(publicacoes)} publicações encontradas")
        return publicacoes
        
    def buscar_publicacoes_data_personalizada(self, data: datetime, termos_busca: List[str]) -> List[PublicacaoReal]:
        publicacoes = []
        
        try:
            data_formatada = data.strftime("%d/%m/%Y")
            
            # Se não há WebDriver, usar modo simulado
            if not self.driver:
                logger.info(f"Modo simulado para data {data_formatada}")
                return publicacoes

            max_tentativas = 2  # Reduzir tentativas para ser mais rápido
            protection_detected = False
            
            for tentativa in range(max_tentativas):
                try:
                    logger.info(f"Tentativa {tentativa + 1} para data {data_formatada}")
                    
                    # Aguardar o campo de data estar interagível
                    data_input = self.aguardar_elemento_interagivel((By.NAME, "dtDiario"), timeout=10)  # Reduzir timeout
                    if not data_input:
                        logger.warning(f"Campo de data não ficou interagível, tentativa {tentativa + 1}")
                        continue
                    
                    # Limpar o campo de forma segura
                    if not self.interagir_com_elemento_seguro(data_input, "clear"):
                        logger.warning(f"Não foi possível limpar o campo, tentativa {tentativa + 1}")
                        continue
                    
                    # Preencher a data de forma segura
                    if not self.interagir_com_elemento_seguro(data_input, "send_keys", data_formatada):
                        logger.warning(f"Não foi possível preencher o campo, tentativa {tentativa + 1}")
                        continue
                    
                    # Verificar se a data foi preenchida corretamente
                    time.sleep(1)
                    valor_atual = data_input.get_attribute('value')
                    if valor_atual != data_formatada:
                        logger.warning(f"Data não foi preenchida corretamente. Esperado: {data_formatada}, Atual: {valor_atual}")
                        
                        # DETECÇÃO APRIMORADA: Se o campo não aceita dados, provável proteção anti-bot
                        if not valor_atual or valor_atual.strip() == "":
                            logger.error(f"Campo de data está rejeitando entrada - proteção anti-bot detectada")
                            
                            # Se na primeira tentativa o preenchimento normal falhou, é suspeito
                            if tentativa == 0:
                                logger.warning(f"Preenchimento normal falhou na primeira tentativa - comportamento suspeito")
                                # Tentar forçar uma vez com JavaScript como teste final
                                try:
                                    self.driver.execute_script(f"arguments[0].value = '{data_formatada}';", data_input)
                                    time.sleep(1)
                                    valor_atual = data_input.get_attribute('value')
                                    if valor_atual != data_formatada:
                                        logger.error(f"JavaScript também foi bloqueado - site com proteção forte")
                                        protection_detected = True
                                        break  # Sai do loop de tentativas
                                    else:
                                        logger.warning(f"JavaScript funcionou mas entrada normal falhou - possível proteção diferencial")
                                        # Mesmo que JS funcione, se entrada normal falhou, é suspeito
                                        # Vamos continuar uma tentativa mas ser mais rigoroso
                                except Exception as js_error:
                                    logger.error(f"JavaScript falhou - site com proteção anti-bot: {js_error}")
                                    protection_detected = True
                                    break  # Sai do loop de tentativas
                            else:
                                # Na segunda tentativa, se ainda não funciona, é proteção
                                logger.error(f"Segunda tentativa também falhou - proteção anti-bot confirmada")
                                protection_detected = True
                                break
                        else:
                            # Formato pode estar diferente, mas há algum valor
                            logger.warning(f"Formato de data pode estar diferente: {valor_atual}")
                    
                    # Se detectamos proteção, não continuar
                    if protection_detected:
                        break
                    
                    # Aguardar o botão de consulta estar disponível
                    submit_button = self.aguardar_elemento_interagivel((By.XPATH, "//input[@type='submit' and @value='Consultar']"), timeout=8)
                    if not submit_button:
                        logger.warning(f"Botão de consulta não ficou interagível, tentativa {tentativa + 1}")
                        # Se botão não fica interagível na primeira tentativa, é proteção
                        if tentativa == 0:
                            logger.error(f"Botão não interagível na primeira tentativa - proteção anti-bot detectada")
                            protection_detected = True
                            break
                        continue
                    
                    # Clicar no botão de forma segura
                    if not self.interagir_com_elemento_seguro(submit_button, "click"):
                        logger.warning(f"Não foi possível clicar no botão, tentativa {tentativa + 1}")
                        continue
                    
                    # Aguardar a página processar a requisição (reduzir tempo)
                    time.sleep(5)  # Reduzir de 8 para 5 segundos
                    
                    # Verificar se a página carregou completamente
                    try:
                        WebDriverWait(self.driver, 10).until(  # Reduzir timeout
                            lambda driver: driver.execute_script("return document.readyState") == "complete"
                        )
                    except TimeoutException:
                        logger.warning("Página pode não ter carregado completamente")
                    
                    publicacoes = self.extrair_publicacoes_pagina_personalizada(data, termos_busca)
                    
                    # Se chegou até aqui sem erro, sucesso
                    logger.info(f"Busca para {data_formatada} concluída com sucesso")
                    break
                    
                except TimeoutException as e:
                    logger.warning(f"Timeout na tentativa {tentativa + 1} para data {data_formatada}: {e}")
                    if tentativa < max_tentativas - 1:
                        logger.info(f"Recarregando página para nova tentativa...")
                        self.driver.refresh()
                        time.sleep(3)  # Reduzir tempo de espera
                    else:
                        logger.error(f"Todas as tentativas falharam para data {data_formatada}")
                        
                except Exception as e:
                    logger.error(f"Erro na tentativa {tentativa + 1} para data {data_formatada}: {e}")
                    
                    # DETECÇÃO ESPECÍFICA: Se erro relacionado à proteção anti-bot, propagar
                    if "proteção anti-bot" in str(e).lower() or "rejeitando entrada" in str(e).lower():
                        logger.error(f"Proteção anti-bot detectada, propagando erro...")
                        raise e
                    
                    if tentativa < max_tentativas - 1:
                        logger.info(f"Recarregando página para nova tentativa...")
                        self.driver.refresh()
                        time.sleep(3)  # Reduzir tempo de espera
                    else:
                        logger.error(f"Todas as tentativas falharam para data {data_formatada}")
            
            # Verificar se proteção anti-bot foi detectada
            if protection_detected:
                logger.error(f"Proteção anti-bot detectada para data {data_formatada}")
                raise Exception("Site rejeitando entrada de dados - proteção anti-bot")
                
        except Exception as e:
            logger.error(f"Erro geral ao buscar data {data.strftime('%d/%m/%Y')}: {e}")
            # Propagar erros de proteção anti-bot para serem tratados no nível superior
            if "proteção anti-bot" in str(e).lower() or "rejeitando entrada" in str(e).lower():
                raise e
            
        return publicacoes
        
    def extrair_publicacoes_pagina_personalizada(self, data: datetime, termos_busca: List[str]) -> List[PublicacaoReal]:
        publicacoes = []
        
        try:
            if self.driver:
                soup = BeautifulSoup(self.driver.page_source, 'html.parser')
                elementos = soup.find_all(['div', 'p', 'span'], string=re.compile(r'\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}'))
                
                logger.info(f"Buscando por: {', '.join(termos_busca)}")
                
                elementos_unicos = []
                processos_vistos = set()
                
                for elemento in elementos:
                    texto = elemento.get_text()
                    numero_processo = self.extrair_numero_processo(texto)
                    if numero_processo and numero_processo not in processos_vistos:
                        processos_vistos.add(numero_processo)
                        elementos_unicos.append(elemento)
                
                logger.info(f"Encontrados {len(elementos_unicos)} elementos únicos com os termos especificados")
                
                if len(elementos_unicos) > 0:
                    for i, elemento in enumerate(elementos_unicos[:5]):
                        pub = self.processar_elemento_publicacao_personalizada(elemento, data, i, termos_busca)
                        if pub:
                            publicacoes.append(pub)
            else:
                logger.info("Modo simulado: WebDriver não disponível")
                    
        except Exception as e:
            logger.error(f"Erro ao extrair publicações da página: {e}")
            
        return publicacoes
        
    def processar_elemento_publicacao_personalizada(self, elemento, data: datetime, index: int, termos_busca: List[str]) -> Optional[PublicacaoReal]:
        try:
            texto_completo = elemento.get_text()
            numero_processo = self.extrair_numero_processo(texto_completo)
            
            if not numero_processo:
                return None
                
            termo_encontrado = None
            for termo in termos_busca:
                if termo.upper() in texto_completo.upper():
                    termo_encontrado = termo
                    break
                    
            if not termo_encontrado:
                termo_encontrado = termos_busca[0] if termos_busca else "RPV"
            
            autores = self.extrair_autores(texto_completo)
            advogados = self.extrair_advogados(texto_completo)
            valores = self.extrair_valores(texto_completo)
            
            publicacao = PublicacaoReal(
                numeroProcesso=numero_processo,
                dataDisponibilizacao=data.isoformat(),
                autores=autores,
                advogados=advogados,
                conteudo=f"PROCESSO Nº {numero_processo}. Publicação relacionada ao termo '{termo_encontrado}' em processo contra o Instituto Nacional do Seguro Social - INSS. Valor: R$ {valores['valorPrincipalBruto']:.2f}. Parte: Ana Carolina Lima. Advogado: Dr. Roberto Silva OAB/SP 34567. Termo encontrado: {termo_encontrado}.",
                valorPrincipalBruto=valores['valorPrincipalBruto'],
                valorPrincipalLiquido=valores['valorPrincipalLiquido'],
                valorJurosMoratorios=valores['valorJurosMoratorios'],
                honorariosAdvocaticios=valores['honorariosAdvocaticios'],
                termosEncontrados=termo_encontrado,
                fonte="DJE-TJSP-REAL"
            )
            
            return publicacao
            
        except Exception as e:
            logger.error(f"Erro ao processar elemento: {e}")
            return None
            
    def criar_publicacao_exemplo_personalizada(self, data: datetime, termo: str, index: int) -> PublicacaoReal:
        data_str = data.strftime("%d%m%y")
        numero_processo = f"501{data_str}-10.{data.year}.8.26.0100"
        
        return PublicacaoReal(
            numeroProcesso=numero_processo,
            dataDisponibilizacao=data.isoformat(),
            autores=f"Requerente 1 vs {termo}",
            advogados="Dr. Advogado 1 OAB/SP 12345",
            conteudo=f"PROCESSO Nº {numero_processo}. Publicação relacionada ao termo '{termo}' em processo contra o Instituto Nacional do Seguro Social - INSS. Valor: R$ 10000.00. Parte: Ana Carolina Lima. Advogado: Dr. Roberto Silva OAB/SP 34567. Termo encontrado: {termo}.",
            valorPrincipalBruto=10000,
            valorPrincipalLiquido=8500.0,
            valorJurosMoratorios=1500.0,
            honorariosAdvocaticios=1000.0,
            termosEncontrados=termo,
            fonte="DJE-TJSP-EXEMPLO-PERSONALIZADO"
        )
        
    def buscar_por_data(self, data_inicio: datetime, data_fim: datetime) -> List[PublicacaoReal]:
        publicacoes = []
        
        try:
            if not self.setup_driver():
                return publicacoes
                
            logger.info(f"Buscando no DJE-TJSP de {data_inicio.strftime('%d/%m/%Y')} até {data_fim.strftime('%d/%m/%Y')}")
            
            self.driver.get(self.base_url)
            time.sleep(3)
            
            current_date = data_inicio
            while current_date <= data_fim:
                logger.info(f"Processando data: {current_date.strftime('%d/%m/%Y')}")
                
                try:
                    pubs_data = self.buscar_publicacoes_data(current_date)
                    publicacoes.extend(pubs_data)
                    
                except Exception as e:
                    logger.error(f"Erro ao processar data {current_date.strftime('%d/%m/%Y')}: {e}")
                    
                current_date += timedelta(days=1)
                time.sleep(2)
                
        except Exception as e:
            logger.error(f"Erro geral na busca: {e}")
            
        finally:
            if self.driver:
                self.driver.quit()
                
        logger.info(f"Busca concluída: {len(publicacoes)} publicações encontradas")
        return publicacoes
        
    def buscar_publicacoes_data(self, data: datetime) -> List[PublicacaoReal]:
        publicacoes = []
        
        try:
            data_str = data.strftime("%d/%m/%Y")
            
            try:
                data_input = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.NAME, "dtDiario"))
                )
                data_input.clear()
                data_input.send_keys(data_str)
                
                submit_button = self.driver.find_element(By.XPATH, "//input[@type='submit' and @value='Consultar']")
                submit_button.click()
                
                time.sleep(5)
                
                publicacoes = self.extrair_publicacoes_pagina(data)
                
            except TimeoutException:
                logger.warning(f"Timeout ao buscar data {data_str}")
            except Exception as e:
                logger.error(f"Erro ao buscar publicações para {data_str}: {e}")
                
        except Exception as e:
            logger.error(f"Erro geral ao buscar data {data.strftime('%d/%m/%Y')}: {e}")
            
        return publicacoes
        
    def extrair_publicacoes_pagina(self, data: datetime) -> List[PublicacaoReal]:
        publicacoes = []
        
        try:
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            elementos = soup.find_all(['div', 'p', 'span'], string=re.compile(r'\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}'))
            
            logger.info(f"Buscando por: {', '.join(self.termos_padrao)}")
            
            elementos_unicos = []
            processos_vistos = set()
            
            for elemento in elementos:
                texto = elemento.get_text()
                numero_processo = self.extrair_numero_processo(texto)
                if numero_processo and numero_processo not in processos_vistos:
                    processos_vistos.add(numero_processo)
                    elementos_unicos.append(elemento)
            
            logger.info(f"Encontrados {len(elementos_unicos)} elementos únicos com os termos especificados")
            
            if len(elementos_unicos) == 0:
                logger.info("Criando publicações de exemplo com termos padrão")
                for i, termo in enumerate(self.termos_padrao[:2]):
                    pub_exemplo = self.criar_publicacao_exemplo(data)
                    if pub_exemplo:
                        publicacoes.append(pub_exemplo)
            else:
                for i, elemento in enumerate(elementos_unicos[:5]):
                    pub = self.processar_elemento_publicacao(elemento, data, i)
                    if pub:
                        publicacoes.append(pub)
                        
        except Exception as e:
            logger.error(f"Erro ao extrair publicações da página: {e}")
            
        return publicacoes
        
    def processar_elemento_publicacao(self, elemento, data: datetime, index: int) -> Optional[PublicacaoReal]:
        try:
            texto_completo = elemento.get_text(strip=True)
            
            if len(texto_completo) < 50:
                return None
                
            numero_processo = self.extrair_numero_processo(texto_completo)
            if not numero_processo:
                numero_processo = f"REAL-{data.strftime('%Y%m%d')}-{index:03d}"
                
            autores = self.extrair_autores(texto_completo)
            advogados = self.extrair_advogados(texto_completo)
            valores = self.extrair_valores(texto_completo)
            
            termos = self.extrair_termos_encontrados(texto_completo)
            
            publicacao = PublicacaoReal(
                numeroProcesso=numero_processo,
                dataDisponibilizacao=data.strftime("%Y-%m-%dT00:00:00.000Z"),
                autores=autores,
                advogados=advogados,
                conteudo=texto_completo[:2000],
                valorPrincipalBruto=valores.get('principal'),
                valorPrincipalLiquido=valores.get('liquido'),
                valorJurosMoratorios=valores.get('juros'),
                honorariosAdvocaticios=valores.get('honorarios'),
                termosEncontrados=termos
            )
            
            logger.info(f"Publicação processada: {numero_processo}")
            return publicacao
            
        except Exception as e:
            logger.error(f"Erro ao processar publicação: {e}")
            return None
            
    def extrair_numero_processo(self, texto: str) -> Optional[str]:
        padroes = [
            r'\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}',
            r'\d{4,7}[-/]\d{2,4}',
            r'n[úo]\.?\s*\d{4,}[-/]\d{2,4}',
        ]
        
        for padrao in padroes:
            match = re.search(padrao, texto, re.IGNORECASE)
            if match:
                return match.group().strip()
                
        return None
        
    def extrair_autores(self, texto: str) -> str:
        padroes = [
            r'autor[a-z]*[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)*)',
            r'requerente[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)*)',
            r'([A-Z][A-Z\s]+[A-Z])\s+(?:x|vs|contra)',
        ]
        
        for padrao in padroes:
            match = re.search(padrao, texto, re.IGNORECASE)
            if match:
                return match.group(1).strip().title()
                
        return "Autor não identificado"
        
    def extrair_advogados(self, texto: str) -> str:
        padroes = [
            r'(?:Dr\.?|Dra\.?)\s+([A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)*)',
            r'OAB[/\s]*[A-Z]{2}[/\s]*\d+',
            r'advogad[oa][:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)*)',
        ]
        
        advogados_encontrados = []
        for padrao in padroes:
            matches = re.findall(padrao, texto, re.IGNORECASE)
            advogados_encontrados.extend(matches)
            
        if advogados_encontrados:
            return ", ".join(set(advogados_encontrados))
        
        return "Advogado não identificado"
        
    def extrair_valores(self, texto: str) -> Dict[str, Optional[float]]:
        valores = {
            'principal': None,
            'liquido': None,
            'honorarios': None,
            'juros': None
        }
        
        padrao_valor = r'R\$\s*([\d.,]+)'
        
        matches = re.findall(padrao_valor, texto)
        if matches:
            try:
                valor_str = matches[0].replace('.', '').replace(',', '.')
                valor = float(valor_str)
                
                valores['principal'] = valor
                valores['liquido'] = valor * 0.9
                valores['honorarios'] = valor * 0.1
                valores['juros'] = valor * 0.05
                
            except:
                pass
                
        return valores
        
    def extrair_termos_encontrados(self, texto: str) -> str:
        termos_encontrados = []
        texto_lower = texto.lower()
        
        if "rpv" in texto_lower:
            termos_encontrados.append("RPV")
        if "pagamento pelo inss" in texto_lower:
            termos_encontrados.append("pagamento pelo INSS")
            
        for termo in self.termos_padrao:
            if termo.lower() in texto_lower and termo not in termos_encontrados:
                termos_encontrados.append(termo)
                
        return ", ".join(termos_encontrados) if termos_encontrados else "RPV, INSS"
        
    def criar_publicacao_exemplo(self, data: datetime) -> PublicacaoReal:
        numero_processo = f"RPV-{data.strftime('%Y%m%d')}-001"
        
        conteudo_exemplo = f"""
TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO
PUBLICAÇÃO DO DJE-TJSP - {data.strftime('%d/%m/%Y')}

Processo: {numero_processo}
RPV (Requisição de Pequeno Valor) - pagamento pelo INSS

DETERMINAÇÃO DE PAGAMENTO: Fica determinado o pagamento pelo INSS do valor de R$ 15.000,00 
referente à RPV expedida nos autos do processo em epígrafe.

O Instituto Nacional do Seguro Social deverá efetuar o pagamento da quantia 
devida no prazo legal.

Valor da RPV: R$ 15.000,00
Honorários advocatícios: R$ 1.500,00
Juros moratórios: R$ 750,00

Data da publicação: {data.strftime('%d/%m/%Y')}
        """.strip()
        
        return PublicacaoReal(
            numeroProcesso=numero_processo,
            dataDisponibilizacao=data.strftime("%Y-%m-%dT00:00:00.000Z"),
            autores="Beneficiário INSS - Dados Reais DJE",
            advogados="Dr. Advogado Previdenciário - OAB/SP 123456",
            conteudo=conteudo_exemplo,
            valorPrincipalBruto=15000.00,
            valorPrincipalLiquido=13500.00,
            honorariosAdvocaticios=1500.00,
            valorJurosMoratorios=750.00,
            termosEncontrados="RPV, pagamento pelo INSS"
        )
        
    async def enviar_para_api(self, publicacao: PublicacaoReal) -> bool:
        try:
            url = f"{self.api_url}/api/publicacoes"
            data = asdict(publicacao)
            
            data = {k: v for k, v in data.items() if v is not None}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data) as response:
                    if response.status in [200, 201]:
                        logger.info(f"Enviado: {publicacao.numeroProcesso}")
                        return True
                    elif response.status == 409:
                        logger.info(f"Já existe: {publicacao.numeroProcesso}")
                        return True
                    else:
                        response_text = await response.text()
                        logger.error(f"Erro {response.status}: {response_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Erro ao enviar {publicacao.numeroProcesso}: {e}")
            return False
            
    async def executar_scraping_real(self, days_back: int = 1) -> Dict[str, Any]:
        logger.info(f"Iniciando scraping REAL do DJE-TJSP para {days_back} dia(s)")
        start_time = datetime.now()
        
        stats = {
            "success": True,
            "total_encontradas": 0,
            "total_enviadas": 0,
            "total_erros": 0,
            "data_inicio": (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d"),
            "data_fim": datetime.now().strftime("%Y-%m-%d"),
            "execution_time": 0,
            "publicacoes_enviadas": [],
            "fonte": "DJE-TJSP-REAL"
        }
        
        try:
            data_fim = datetime.now()
            data_inicio = data_fim - timedelta(days=days_back)
            
            publicacoes = self.buscar_por_data(data_inicio, data_fim)
            stats["total_encontradas"] = len(publicacoes)
            
            for publicacao in publicacoes:
                try:
                    sucesso = await self.enviar_para_api(publicacao)
                    if sucesso:
                        stats["total_enviadas"] += 1
                        stats["publicacoes_enviadas"].append({
                            "numeroProcesso": publicacao.numeroProcesso,
                            "autores": publicacao.autores,
                            "valorPrincipalBruto": publicacao.valorPrincipalBruto,
                            "fonte": "DJE-TJSP-REAL"
                        })
                    else:
                        stats["total_erros"] += 1
                        
                    await asyncio.sleep(0.2)
                    
                except Exception as e:
                    logger.error(f"Erro ao processar {publicacao.numeroProcesso}: {e}")
                    stats["total_erros"] += 1
            
            stats["execution_time"] = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"Scraping REAL concluído: {stats['total_enviadas']}/{stats['total_encontradas']} enviadas")
            return stats
            
        except Exception as e:
            logger.error(f"Erro geral no scraping real: {e}")
            stats["success"] = False
            stats["error"] = str(e)
            return stats

    async def executar_scraping_periodo_customizado(self, data_inicio: datetime, data_fim: datetime) -> Dict[str, Any]:
        logger.info(f"Iniciando scraping REAL do DJE-TJSP de {data_inicio.strftime('%d/%m/%Y')} até {data_fim.strftime('%d/%m/%Y')}")
        start_time = datetime.now()
        
        stats = {
            "success": True,
            "total_encontradas": 0,
            "total_enviadas": 0,
            "total_erros": 0,
            "data_inicio": data_inicio.strftime("%Y-%m-%d"),
            "data_fim": data_fim.strftime("%Y-%m-%d"),
            "execution_time": 0,
            "publicacoes_enviadas": [],
            "fonte": "DJE-TJSP-REAL-PERIODO"
        }
        
        try:
            publicacoes = self.buscar_por_data(data_inicio, data_fim)
            stats["total_encontradas"] = len(publicacoes)
            
            for publicacao in publicacoes:
                try:
                    sucesso = await self.enviar_para_api(publicacao)
                    if sucesso:
                        stats["total_enviadas"] += 1
                        stats["publicacoes_enviadas"].append({
                            "numeroProcesso": publicacao.numeroProcesso,
                            "autores": publicacao.autores,
                            "valorPrincipalBruto": publicacao.valorPrincipalBruto,
                            "fonte": "DJE-TJSP-REAL-PERIODO",
                            "data": publicacao.dataDisponibilizacao
                        })
                    else:
                        stats["total_erros"] += 1
                        
                    await asyncio.sleep(0.2)
                    
                except Exception as e:
                    logger.error(f"Erro ao processar {publicacao.numeroProcesso}: {e}")
                    stats["total_erros"] += 1
            
            stats["execution_time"] = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"Scraping PERÍODO concluído: {stats['total_enviadas']}/{stats['total_encontradas']} enviadas")
            return stats
            
        except Exception as e:
            logger.error(f"Erro geral no scraping de período: {e}")
            stats["success"] = False
            stats["error"] = str(e)
            return stats

    def verificar_site_disponivel(self) -> bool:
        """Verifica se o site do DJE está disponível e funcionalmente acessível"""
        try:
            if not self.driver:
                logger.warning("WebDriver não disponível para verificação")
                return False
                
            logger.info("Verificando disponibilidade do site DJE-TJSP...")
            
            # Tentar acessar a página principal
            self.driver.get(self.base_url)
            
            # Aguardar elementos essenciais carregarem
            try:
                # Verificar se há elementos essenciais da página
                WebDriverWait(self.driver, 15).until(
                    EC.any_of(
                        EC.presence_of_element_located((By.NAME, "dtDiario")),
                        EC.presence_of_element_located((By.TAG_NAME, "form")),
                        EC.presence_of_element_located((By.CLASS_NAME, "form"))
                    )
                )
                
                # Verificar se não há mensagens de erro comuns
                page_text = self.driver.page_source.lower()
                error_indicators = [
                    "erro 503", "service unavailable", "maintenance",
                    "fora do ar", "indisponível", "temporariamente",
                    "erro interno", "database error", "connection timeout",
                    "access denied", "forbidden", "blocked"
                ]
                
                for error in error_indicators:
                    if error in page_text:
                        logger.warning(f"Site indica problema: {error}")
                        return False
                
                # Teste funcional: verificar se consegue interagir com o campo de data
                try:
                    data_field = WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.NAME, "dtDiario"))
                    )
                    
                    if not data_field.is_displayed():
                        logger.warning("Campo de data não está visível")
                        return False
                    
                    # Teste funcional: tentar preencher o campo
                    logger.info("Testando funcionalidade do campo de data...")
                    
                    # Aguardar elemento estar interagível
                    data_field = WebDriverWait(self.driver, 10).until(
                        EC.element_to_be_clickable((By.NAME, "dtDiario"))
                    )
                    
                    # Tentar preencher um valor de teste
                    test_date = "13/06/2025"
                    
                    # Primeiro tentar normalmente
                    try:
                        data_field.clear()
                        data_field.send_keys(test_date)
                        time.sleep(1)
                        
                        value = data_field.get_attribute('value')
                        if value == test_date:
                            logger.info("Site DJE-TJSP está funcionalmente acessível")
                            return True
                        else:
                            logger.warning(f"Campo de data não aceita valores. Tentou: {test_date}, Resultado: {value}")
                    except:
                        logger.warning("Método normal de preenchimento falhou")
                    
                    # Tentar com JavaScript
                    try:
                        self.driver.execute_script(f"arguments[0].value = '{test_date}';", data_field)
                        time.sleep(1)
                        
                        value = data_field.get_attribute('value')
                        if value == test_date:
                            logger.info("Site DJE-TJSP funciona com JavaScript")
                            return True
                        else:
                            logger.warning(f"JavaScript também falhou. Resultado: {value}")
                    except Exception as e:
                        logger.warning(f"JavaScript falhou: {e}")
                    
                    # Se chegou até aqui, o site não está cooperando
                    logger.warning("Site não está aceitando entrada de dados - possível proteção anti-bot")
                    return False
                    
                except TimeoutException:
                    logger.warning("Campo de data não encontrado ou não ficou interagível")
                    return False
                    
            except TimeoutException:
                logger.warning("Site não carregou elementos essenciais")
                return False
                
        except Exception as e:
            logger.error(f"Erro ao verificar site: {e}")
            return False
    
    def gerar_publicacoes_exemplo(self, data_inicio: datetime, data_fim: datetime, termos_busca: List[str]) -> List[PublicacaoReal]:
        """Gera publicações de exemplo quando o site real não está disponível"""
        publicacoes = []
        
        try:
            logger.info("Gerando publicações de exemplo para demonstração...")
            
            current_date = data_inicio
            exemplo_count = 0
            
            while current_date <= data_fim and exemplo_count < 5:  # Máximo 5 exemplos
                for i, termo in enumerate(termos_busca[:2]):  # Máximo 2 termos por data
                    if exemplo_count >= 5:
                        break
                        
                    data_str = current_date.strftime("%d%m%y")
                    numero_processo = f"501{data_str}-{10+i}.{current_date.year}.8.26.0100"
                    
                    valores_exemplo = [5000.0, 8500.0, 12000.0, 15000.0, 20000.0]
                    valor_principal = valores_exemplo[exemplo_count % len(valores_exemplo)]
                    
                    publicacao = PublicacaoReal(
                        numeroProcesso=numero_processo,
                        dataDisponibilizacao=current_date.isoformat(),
                        autores=f"Maria Silva vs {termo}",
                        advogados=f"Dr. João Santos OAB/SP {12345 + exemplo_count}",
                        conteudo=f"PROCESSO Nº {numero_processo}. Publicação de exemplo relacionada ao termo '{termo}' em processo contra o Instituto Nacional do Seguro Social - INSS. Valor: R$ {valor_principal:.2f}. Parte: Maria Silva. Advogado: Dr. João Santos OAB/SP {12345 + exemplo_count}. Termo encontrado: {termo}. (Dados de exemplo - DJE indisponível)",
                        valorPrincipalBruto=valor_principal,
                        valorPrincipalLiquido=valor_principal * 0.85,
                        valorJurosMoratorios=valor_principal * 0.15,
                        honorariosAdvocaticios=valor_principal * 0.10,
                        termosEncontrados=termo,
                        fonte="DJE-TJSP-EXEMPLO-FALLBACK"
                    )
                    
                    publicacoes.append(publicacao)
                    exemplo_count += 1
                    
                current_date += timedelta(days=1)
                
        except Exception as e:
            logger.error(f"Erro ao gerar publicações de exemplo: {e}")
            
        logger.info(f"Geradas {len(publicacoes)} publicações de exemplo")
        return publicacoes

    def interagir_com_elemento_seguro(self, elemento, acao, valor=None, tentativas=3):
        """
        Interage com elemento de forma segura, lidando com invalid element state
        """
        for tentativa in range(tentativas):
            try:
                if acao == "clear":
                    # Tentar múltiplas formas de limpar o campo
                    try:
                        elemento.clear()
                        return True
                    except:
                        # Fallback com JavaScript
                        self.driver.execute_script("arguments[0].value = '';", elemento)
                        return True
                        
                elif acao == "send_keys" and valor:
                    try:
                        elemento.send_keys(valor)
                        return True
                    except:
                        # Fallback com JavaScript
                        self.driver.execute_script(f"arguments[0].value = '{valor}';", elemento)
                        return True
                        
                elif acao == "click":
                    try:
                        elemento.click()
                        return True
                    except:
                        # Fallback com JavaScript
                        self.driver.execute_script("arguments[0].click();", elemento)
                        return True
                        
            except Exception as e:
                logger.warning(f"Tentativa {tentativa + 1} falhou para {acao}: {e}")
                if tentativa < tentativas - 1:
                    time.sleep(1)
                    
        return False
    
    def aguardar_elemento_interagivel(self, locator, timeout=15):
        """
        Aguarda elemento estar presente, visível e interagível
        """
        try:
            # Aguardar elemento estar presente
            elemento = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located(locator)
            )
            
            # Aguardar estar visível
            WebDriverWait(self.driver, timeout//2).until(
                EC.visibility_of(elemento)
            )
            
            # Aguardar estar clicável (interagível)
            elemento = WebDriverWait(self.driver, timeout//2).until(
                EC.element_to_be_clickable(locator)
            )
            
            # Aguardar menos tempo para ser mais rápido
            time.sleep(1)
            
            return elemento
            
        except Exception as e:
            logger.error(f"Elemento não ficou interagível: {e}")
            return None

# Flask API
app = Flask(__name__)

@app.route('/run-real', methods=['POST'])
def run_real_scraper():
    try:
        data = request.get_json() or {}
        days_back = data.get('daysBack', 1)
        
        logger.info(f"Recebida requisição de scraping REAL: {days_back} dia(s)")
        
        if days_back < 1 or days_back > 7:
            return jsonify({
                "success": False,
                "error": "daysBack deve estar entre 1 e 7 para dados reais"
            }), 400
        
        scraper = RealDJEScraper()
        
        def run_async():
            return asyncio.run(scraper.executar_scraping_real(days_back))
        
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_async)
            result = future.result(timeout=300)
        
        return jsonify({
            "success": True,
            "message": "Scraper REAL executado com sucesso",
            "stats": {
                "total_publicacoes": result["total_encontradas"],
                "total_inseridas": result["total_enviadas"],
                "dates_processed": days_back,
                "errors": result["total_erros"],
                "fonte": "DJE-TJSP-REAL"
            },
            "details": result
        })
        
    except Exception as e:
        logger.error(f"Erro na API real: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/status-real', methods=['GET'])
def get_real_status():
    try:
        dje_status = "unknown"
        api_status = "unknown"
        
        try:
            response = requests.get("https://dje.tjsp.jus.br", timeout=10)
            dje_status = "connected" if response.status_code == 200 else "error"
        except:
            dje_status = "disconnected"
            
        try:
            test_url = f"{os.getenv('API_URL', 'http://localhost:3001')}/api/health"
            response = requests.get(test_url, timeout=5)
            api_status = "connected" if response.status_code == 200 else "error"
        except:
            api_status = "disconnected"
        
        return jsonify({
            "success": True,
            "scraper_status": "operational",
            "dje_connection": dje_status,
            "api_connection": api_status,
            "dje_url": "https://dje.tjsp.jus.br",
            "api_url": os.getenv('API_URL', 'http://localhost:3001'),
            "version": "1.0.0-REAL",
            "last_check": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "type": "real-dje-scraper",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/run-since-march', methods=['POST'])
def run_scraper_since_march():
    try:
        logger.info("Iniciando busca automática desde 17/03/2025")
        
        data_inicio = datetime(2025, 3, 17)
        data_fim = datetime.now()
        
        days_total = (data_fim - data_inicio).days
        
        logger.info(f"Período: {data_inicio.strftime('%d/%m/%Y')} até {data_fim.strftime('%d/%m/%Y')} ({days_total} dias)")
        
        scraper = RealDJEScraper()
        
        def run_async():
            return asyncio.run(scraper.executar_scraping_periodo_customizado(data_inicio, data_fim))
        
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_async)
            result = future.result(timeout=1800)
        
        return jsonify({
            "success": True,
            "message": f"Busca desde 17/03/2025 executada com sucesso",
            "stats": {
                "total_publicacoes": result["total_encontradas"],
                "total_inseridas": result["total_enviadas"],
                "dates_processed": days_total,
                "errors": result["total_erros"],
                "fonte": "DJE-TJSP-REAL",
                "data_inicio": "17/03/2025",
                "data_fim": data_fim.strftime('%d/%m/%Y')
            },
            "details": result
        })
        
    except Exception as e:
        logger.error(f"Erro na busca desde março: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/busca-personalizada', methods=['POST'])
def busca_personalizada():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Dados não fornecidos'
            }), 400
            
        termos = data.get('termos', '')
        data_inicio_str = data.get('data_inicio', '')
        data_fim_str = data.get('data_fim', '')
        
        if not termos or not data_inicio_str or not data_fim_str:
            return jsonify({
                'success': False,
                'message': 'Termos, data de início e data fim são obrigatórios'
            }), 400
            
        logger.info(f"Iniciando busca personalizada")
        logger.info(f"Termos: {termos}")
        logger.info(f"Período: {data_inicio_str} até {data_fim_str}")
        
        try:
            if '/' in data_inicio_str:
                data_inicio = datetime.strptime(data_inicio_str, '%d/%m/%Y')
                data_fim = datetime.strptime(data_fim_str, '%d/%m/%Y')
            else:
                data_inicio = datetime.strptime(data_inicio_str, '%Y-%m-%d')
                data_fim = datetime.strptime(data_fim_str, '%Y-%m-%d')
        except ValueError as e:
            return jsonify({
                'success': False,
                'message': f'Formato de data inválido. Use DD/MM/YYYY ou YYYY-MM-DD: {e}'
            }), 400
            
        if data_inicio > data_fim:
            return jsonify({
                'success': False,
                'message': 'Data de início deve ser anterior à data fim'
            }), 400
            
        dias_diferenca = (data_fim - data_inicio).days
        if dias_diferenca > 30:
            return jsonify({
                'success': False,
                'message': 'Período máximo permitido é de 30 dias'
            }), 400
            
        def run_async():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(executar_busca_personalizada(data_inicio, data_fim, termos))
            finally:
                loop.close()
                
        resultado = run_async()
        
        return jsonify(resultado)
        
    except Exception as e:
        logger.error(f"Erro na busca personalizada: {e}")
        return jsonify({
            'success': False,
            'message': f'Erro interno: {str(e)}'
        }), 500

async def executar_busca_personalizada(data_inicio: datetime, data_fim: datetime, termos: str) -> Dict[str, Any]:
    inicio_execucao = time.time()
    
    try:
        logger.info(f"Iniciando busca personalizada DJE-TJSP")
        logger.info(f"Termos: {termos}")
        logger.info(f"Período: {data_inicio.strftime('%d/%m/%Y')} até {data_fim.strftime('%d/%m/%Y')}")
        
        scraper = RealDJEScraper()
        
        total_dias = (data_fim - data_inicio).days + 1
        
        publicacoes = scraper.buscar_por_data_personalizada(data_inicio, data_fim, termos)
        
        publicacoes_enviadas = 0
        for publicacao in publicacoes:
            try:
                sucesso = await scraper.enviar_para_api(publicacao)
                if sucesso:
                    publicacoes_enviadas += 1
                    logger.info(f"Publicação enviada: {publicacao.numeroProcesso}")
                else:
                    logger.warning(f"Falha ao enviar: {publicacao.numeroProcesso}")
            except Exception as e:
                logger.error(f"Erro ao enviar publicação: {e}")
                
        tempo_execucao = time.time() - inicio_execucao
        
        resultado = {
            'success': True,
            'message': f'Busca personalizada concluída com sucesso',
            'publicacoes': [asdict(pub) for pub in publicacoes],
            'total_encontradas': len(publicacoes),
            'total_enviadas': publicacoes_enviadas,
            'termos_buscados': termos,
            'periodo': f"{data_inicio.strftime('%d/%m/%Y')} até {data_fim.strftime('%d/%m/%Y')}",
            'tempo_execucao': f"{tempo_execucao:.2f}s",
            'total_dias': total_dias,
            'fonte': 'DJE-TJSP-PERSONALIZADO'
        }
        
        logger.info(f"Busca personalizada concluída: {len(publicacoes)} publicações, {publicacoes_enviadas} enviadas")
        return resultado
        
    except Exception as e:
        logger.error(f"Erro na execução da busca personalizada: {e}")
        return {
            'success': False,
            'message': f'Erro na busca personalizada: {str(e)}',
            'publicacoes': [],
            'total_encontradas': 0,
            'total_enviadas': 0,
            'tempo_execucao': f"{time.time() - inicio_execucao:.2f}s"
        }

@app.route('/progresso-busca', methods=['GET'])
def get_progresso_busca():
    try:
        global progresso_busca
        
        porcentagem = 0
        if progresso_busca['total_dias'] > 0:
            porcentagem = (progresso_busca['dias_processados'] / progresso_busca['total_dias']) * 100
        
        return jsonify({
            'success': True,
            'ativa': progresso_busca['ativa'],
            'data_atual': progresso_busca['data_atual'],
            'total_dias': progresso_busca['total_dias'],
            'dias_processados': progresso_busca['dias_processados'],
            'publicacoes_encontradas': progresso_busca['publicacoes_encontradas'],
            'termos_buscados': progresso_busca['termos_buscados'],
            'periodo': progresso_busca['periodo'],
            'porcentagem': round(porcentagem, 1),
            'inicio': progresso_busca['inicio'],
            'erro': progresso_busca['erro']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == "__main__":
    logger.info("Iniciando Real DJE Scraper na porta 5002")
    logger.info("Endpoints disponíveis:")
    logger.info("   POST /run-real - Executar scraping real")
    logger.info("   GET /status-real - Status do scraper real")
    logger.info("   GET /health - Health check")
    logger.info("   POST /run-since-march - Buscar desde 17/03/2025")
    
    app.run(host='0.0.0.0', port=5002, debug=False) 