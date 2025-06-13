#!/usr/bin/env python3
"""
DJE Web Scraper - JusCash
Scraper profissional para o Diário de Justiça Eletrônico do TJSP
Especificação: Caderno 3 - Judicial - 1ª Instância - Capital Parte 1

Desenvolvido com padrões de nível Vale do Silício:
- Tratamento robusto de erros
- Logging estruturado
- Rate limiting inteligente
- Recuperação automática de falhas
- Monitoramento de performance
"""

import asyncio
import logging
import re
import time
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import aiohttp
import psycopg2
from bs4 import BeautifulSoup
from dataclasses import dataclass
from tenacity import retry, stop_after_attempt, wait_exponential

# Configuração de logging profissional
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('dje_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class PublicacaoData:
    """Estrutura de dados para uma publicação do DJE"""
    numero_processo: str
    data_disponibilizacao: datetime
    autores: str
    advogados: Optional[str]
    conteudo: str
    valor_principal_bruto: Optional[Decimal]
    valor_principal_liquido: Optional[Decimal]
    valor_juros_moratorios: Optional[Decimal]
    honorarios_advocaticios: Optional[Decimal]
    termos_encontrados: str
    fonte: str = "DJE - Caderno 3 - Judicial - 1ª Instância - Capital Parte 1"

class DJEScraper:
    """
    Scraper profissional para o DJE-TJSP
    
    Features:
    - Busca inteligente com múltiplos termos
    - Extração robusta de dados estruturados
    - Rate limiting para evitar bloqueios
    - Recuperação automática de erros
    - Cache de sessão para performance
    """
    
    def __init__(self, db_config: Dict[str, str], search_terms: List[str]):
        self.base_url = "https://dje.tjsp.jus.br"
        self.search_url = f"{self.base_url}/cdje/index.do"
        self.db_config = db_config
        self.search_terms = search_terms
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Headers para parecer um navegador real
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # Padrões regex para extração de dados
        self.patterns = {
            'processo': re.compile(r'\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}'),
            'valor_monetario': re.compile(r'R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)', re.IGNORECASE),
            'oab': re.compile(r'OAB[:/]?\s*(\d+/[A-Z]{2})', re.IGNORECASE),
            'cpf_cnpj': re.compile(r'\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}'),
        }

    async def __aenter__(self):
        """Context manager entry"""
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            connector=connector,
            headers=self.headers
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        if self.session:
            await self.session.close()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def fetch_page(self, url: str, params: Optional[Dict] = None) -> str:
        """
        Fetch página com retry automático e rate limiting
        """
        if not self.session:
            raise RuntimeError("Session not initialized. Use async context manager.")
            
        try:
            # Rate limiting inteligente
            await asyncio.sleep(2)  # 2 segundos entre requests
            
            async with self.session.get(url, params=params) as response:
                response.raise_for_status()
                content = await response.text()
                
                logger.info(f"Successfully fetched: {url} - Status: {response.status}")
                return content
                
        except aiohttp.ClientError as e:
            logger.error(f"HTTP error fetching {url}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching {url}: {e}")
            raise

    def extract_processo_number(self, text: str) -> Optional[str]:
        """Extrai número do processo do texto"""
        match = self.patterns['processo'].search(text)
        return match.group(0) if match else None

    def extract_monetary_values(self, text: str) -> Dict[str, Optional[Decimal]]:
        """
        Extrai valores monetários do texto da publicação
        Retorna dicionário com os tipos de valores encontrados
        """
        values = {
            'valor_principal_bruto': None,
            'valor_principal_liquido': None,
            'valor_juros_moratorios': None,
            'honorarios_advocaticios': None
        }
        
        # Busca por valores monetários no texto
        monetary_matches = self.patterns['valor_monetario'].findall(text.lower())
        
        if monetary_matches:
            # Lógica inteligente para categorizar valores
            text_lower = text.lower()
            
            for i, value_str in enumerate(monetary_matches):
                # Converte string para Decimal
                clean_value = value_str.replace('.', '').replace(',', '.')
                try:
                    value = Decimal(clean_value)
                except:
                    continue
                
                # Contexto ao redor do valor para identificar tipo
                match_pos = text_lower.find(f"r$ {value_str}")
                context = text_lower[max(0, match_pos-100):match_pos+100]
                
                # Categorização baseada em contexto
                if any(term in context for term in ['principal', 'bruto', 'total']):
                    if not values['valor_principal_bruto']:
                        values['valor_principal_bruto'] = value
                elif any(term in context for term in ['líquido', 'liquido']):
                    if not values['valor_principal_liquido']:
                        values['valor_principal_liquido'] = value
                elif any(term in context for term in ['juros', 'mora', 'moratórios']):
                    if not values['valor_juros_moratorios']:
                        values['valor_juros_moratorios'] = value
                elif any(term in context for term in ['honorários', 'honorarios', 'advocatícios']):
                    if not values['honorarios_advocaticios']:
                        values['honorarios_advocaticios'] = value
                elif not values['valor_principal_bruto']:
                    # Se não identificou o tipo, assume como principal
                    values['valor_principal_bruto'] = value
        
        return values

    def extract_advogados(self, text: str) -> Optional[str]:
        """Extrai informações dos advogados com OAB"""
        oab_matches = self.patterns['oab'].findall(text)
        if not oab_matches:
            return None
            
        # Busca nomes próximos aos números OAB
        advogados = []
        for oab in oab_matches:
            # Procura por padrões de nome antes do OAB
            oab_pos = text.find(f"OAB {oab}")
            if oab_pos == -1:
                oab_pos = text.find(f"OAB: {oab}")
            if oab_pos == -1:
                oab_pos = text.find(f"OAB/{oab}")
                
            if oab_pos > 0:
                # Pega texto antes do OAB para encontrar nome
                before_text = text[max(0, oab_pos-100):oab_pos]
                # Regex para nome (sequência de palavras capitalizadas)
                name_pattern = re.compile(r'([A-Z][a-z]+(?: [A-Z][a-z]+)*)\s*$')
                name_match = name_pattern.search(before_text)
                if name_match:
                    advogados.append(f"{name_match.group(1)} (OAB: {oab})")
                else:
                    advogados.append(f"Advogado (OAB: {oab})")
        
        return '\n'.join(advogados) if advogados else None

    def parse_publicacao(self, html_content: str, data_disponibilizacao: datetime) -> List[PublicacaoData]:
        """
        Parse HTML content e extrai publicações que contêm os termos de busca
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        publicacoes = []
        
        # Encontra todas as publicações no HTML
        # Estrutura específica do DJE pode variar, adaptável
        publicacao_elements = soup.find_all(['div', 'p', 'span'], class_=re.compile(r'publicacao|materia|conteudo', re.I))
        
        if not publicacao_elements:
            # Fallback: busca por padrões de texto
            publicacao_elements = soup.find_all(string=self.patterns['processo'])
            publicacao_elements = [elem.parent for elem in publicacao_elements if elem.parent]
        
        for element in publicacao_elements:
            try:
                text_content = element.get_text(strip=True, separator=' ')
                
                # Verifica se contém os termos obrigatórios
                terms_found = []
                for term in self.search_terms:
                    if term.lower() in text_content.lower():
                        terms_found.append(term)
                
                # Deve conter pelo menos 2 termos obrigatórios
                if len(terms_found) < 2:
                    continue
                
                # Extrai número do processo
                numero_processo = self.extract_processo_number(text_content)
                if not numero_processo:
                    continue
                
                # Extrai valores monetários
                valores = self.extract_monetary_values(text_content)
                
                # Extrai advogados
                advogados = self.extract_advogados(text_content)
                
                # Extrai autores (primeira parte antes de " x " ou " vs ")
                autores_match = re.search(r'^(.*?)(?:\s+x\s+|\s+vs?\s+|\s+contra\s+)', text_content, re.IGNORECASE)
                autores = autores_match.group(1).strip() if autores_match else "Não identificado"
                
                publicacao = PublicacaoData(
                    numero_processo=numero_processo,
                    data_disponibilizacao=data_disponibilizacao,
                    autores=autores,
                    advogados=advogados,
                    conteudo=text_content,
                    valor_principal_bruto=valores['valor_principal_bruto'],
                    valor_principal_liquido=valores['valor_principal_liquido'],
                    valor_juros_moratorios=valores['valor_juros_moratorios'],
                    honorarios_advocaticios=valores['honorarios_advocaticios'],
                    termos_encontrados=', '.join(terms_found)
                )
                
                publicacoes.append(publicacao)
                logger.info(f"Publicação extraída: {numero_processo}")
                
            except Exception as e:
                logger.error(f"Erro ao processar publicação: {e}")
                continue
        
        return publicacoes

    async def scrape_date(self, target_date: datetime) -> List[PublicacaoData]:
        """
        Scrape publicações de uma data específica
        """
        logger.info(f"Iniciando scrape para data: {target_date.strftime('%d/%m/%Y')}")
        
        try:
            # Parâmetros para busca no DJE
            params = {
                'dadosConsulta.dtInicio': target_date.strftime('%d/%m/%Y'),
                'dadosConsulta.dtFim': target_date.strftime('%d/%m/%Y'),
                'dadosConsulta.cdCaderno': '3',  # Caderno 3
                'dadosConsulta.cdTipoJudicial': '1',  # 1ª Instância
                'dadosConsulta.cdComarca': '106',  # São Paulo - Capital
                'dadosConsulta.parte': '1',  # Parte 1
            }
            
            # Adiciona termos de busca
            search_query = ' AND '.join(self.search_terms)
            params['dadosConsulta.pesquisaLivre'] = search_query
            
            html_content = await self.fetch_page(self.search_url, params)
            publicacoes = self.parse_publicacao(html_content, target_date)
            
            logger.info(f"Encontradas {len(publicacoes)} publicações para {target_date.strftime('%d/%m/%Y')}")
            return publicacoes
            
        except Exception as e:
            logger.error(f"Erro no scrape da data {target_date}: {e}")
            return []

    def save_to_database(self, publicacoes: List[PublicacaoData]) -> int:
        """
        Salva publicações no banco de dados PostgreSQL
        Retorna número de registros inseridos
        """
        if not publicacoes:
            return 0
            
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            insert_query = """
                INSERT INTO publicacoes (
                    numero_processo, data_disponibilizacao, autores, advogados,
                    conteudo, valor_principal_bruto, valor_principal_liquido,
                    valor_juros_moratorios, honorarios_advocaticios, termos_encontrados,
                    fonte, status, data_extracao
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (numero_processo) DO UPDATE SET
                    data_disponibilizacao = EXCLUDED.data_disponibilizacao,
                    autores = EXCLUDED.autores,
                    advogados = EXCLUDED.advogados,
                    conteudo = EXCLUDED.conteudo,
                    valor_principal_bruto = EXCLUDED.valor_principal_bruto,
                    valor_principal_liquido = EXCLUDED.valor_principal_liquido,
                    valor_juros_moratorios = EXCLUDED.valor_juros_moratorios,
                    honorarios_advocaticios = EXCLUDED.honorarios_advocaticios,
                    termos_encontrados = EXCLUDED.termos_encontrados,
                    updated_at = CURRENT_TIMESTAMP
            """
            
            inserted_count = 0
            for pub in publicacoes:
                try:
                    cursor.execute(insert_query, (
                        pub.numero_processo,
                        pub.data_disponibilizacao,
                        pub.autores,
                        pub.advogados,
                        pub.conteudo,
                        pub.valor_principal_bruto,
                        pub.valor_principal_liquido,
                        pub.valor_juros_moratorios,
                        pub.honorarios_advocaticios,
                        pub.termos_encontrados,
                        pub.fonte,
                        'nova',
                        datetime.now()
                    ))
                    inserted_count += 1
                except psycopg2.IntegrityError as e:
                    logger.warning(f"Publicação já existe: {pub.numero_processo}")
                    conn.rollback()
                    continue
                    
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"Salvos {inserted_count} registros no banco de dados")
            return inserted_count
            
        except Exception as e:
            logger.error(f"Erro ao salvar no banco: {e}")
            return 0

    async def run_daily_scrape(self, days_back: int = 7) -> Dict[str, int]:
        """
        Executa scrape diário para os últimos N dias
        Retorna estatísticas de execução
        """
        logger.info(f"Iniciando scrape diário para os últimos {days_back} dias")
        
        stats = {
            'total_publicacoes': 0,
            'total_inseridas': 0,
            'dates_processed': 0,
            'errors': 0
        }
        
        for i in range(days_back):
            target_date = datetime.now() - timedelta(days=i)
            
            try:
                publicacoes = await self.scrape_date(target_date)
                inserted = self.save_to_database(publicacoes)
                
                stats['total_publicacoes'] += len(publicacoes)
                stats['total_inseridas'] += inserted
                stats['dates_processed'] += 1
                
                # Rate limiting entre datas
                if i < days_back - 1:
                    await asyncio.sleep(5)
                    
            except Exception as e:
                logger.error(f"Erro no scrape da data {target_date}: {e}")
                stats['errors'] += 1
        
        logger.info(f"Scrape concluído. Estatísticas: {stats}")
        return stats

# Função principal para execução
async def main():
    """Função principal do scraper"""
    import argparse
    
    # Parse argumentos da linha de comando
    parser = argparse.ArgumentParser(description='DJE Scraper - JusCash')
    parser.add_argument('--days-back', type=int, default=7, help='Número de dias para buscar (padrão: 7)')
    args = parser.parse_args()
    
    # Configuração do banco de dados
    db_config = {
        'host': 'localhost',
        'database': 'juscash',
        'user': 'juscash_user',
        'password': 'juscash_password',
        'port': 5432
    }
    
    # Termos de busca obrigatórios (configurável)
    search_terms = [
        "INSTITUTO NACIONAL DO SEGURO SOCIAL",
        "INSS",
        # Adicionar termos específicos conforme necessidade
    ]
    
    async with DJEScraper(db_config, search_terms) as scraper:
        stats = await scraper.run_daily_scrape(days_back=args.days_back)
        
        # Log final
        logger.info("=" * 50)
        logger.info("SCRAPING FINALIZADO COM SUCESSO")
        logger.info(f"Publicações encontradas: {stats['total_publicacoes']}")
        logger.info(f"Registros inseridos: {stats['total_inseridas']}")
        logger.info(f"Datas processadas: {stats['dates_processed']}")
        logger.info(f"Erros: {stats['errors']}")
        logger.info("=" * 50)

if __name__ == "__main__":
    asyncio.run(main()) 