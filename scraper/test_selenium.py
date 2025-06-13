#!/usr/bin/env python3
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def test_selenium():
    try:
        options = Options()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--disable-web-security')
        options.add_argument('--allow-running-insecure-content')
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-plugins')
        options.add_argument('--disable-images')
        
        # Configurar para usar Chromium com o chromedriver correto
        options.binary_location = "/usr/bin/chromium"
        
        # Usar o chromedriver disponível
        driver = webdriver.Chrome(service=Service('/usr/bin/chromedriver'), options=options)
        print('✅ WebDriver criado com sucesso')
        
        print('🌐 Acessando site do DJE...')
        driver.get('https://dje.tjsp.jus.br/cdje/index.do')
        print(f'✅ Página carregada, título: {driver.title}')
        
        # Aguardar página carregar completamente
        time.sleep(3)
        
        # Tentar encontrar o campo de data
        try:
            data_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.NAME, "dtDiario"))
            )
            print('✅ Campo de data encontrado')
            print(f'   Visível: {data_field.is_displayed()}')
            print(f'   Habilitado: {data_field.is_enabled()}')
            
            # Testar preenchimento do campo
            data_field.clear()
            data_field.send_keys('13/06/2025')
            valor = data_field.get_attribute('value')
            print(f'   Valor preenchido: {valor}')
            
        except Exception as e:
            print(f'❌ Campo de data não encontrado: {e}')
            
        driver.quit()
        print('✅ Teste concluído com sucesso')
        
    except Exception as e:
        print(f'❌ Erro no teste: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_selenium() 