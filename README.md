# 📍 Alerta Local

O **Alerta Local** é um aplicativo mobile desenvolvido para garantir que você nunca mais perca o ponto de ônibus ou esqueça de descer no local certo.

Diferente de outros apps, ele foi projetado para ser **econômico** (usa OpenStreetMap sem custos de API), **robusto** (funciona em segundo plano com a tela bloqueada) e **privado** (dados salvos localmente no dispositivo).

## ✨ Funcionalidades Principais

- **🗺️ Mapa Gratuito & Leve:** Utiliza **Leaflet** e **OpenStreetMap** via WebView. Não requer chaves de API do Google Maps e não gera custos de uso.
- **🔔 Alarme de Proximidade:** Define um raio de alerta (ex: 500m). O app dispara o alarme quando você entra na zona.
- **⏱️ Alerta de Intervalo:** Continua avisando a cada X metros (ex: a cada 100m) dentro da zona de alerta.
- **📱 Funciona em Segundo Plano:** Graças ao `expo-task-manager` e `expo-location`, o monitoramento continua mesmo com o app fechado ou a tela bloqueada.
- **💾 Salvar Locais:** Persistência de dados usando **SQLite** para salvar seus destinos favoritos.
- **🔊 Gerenciamento de Áudio Inteligente:**
  - **Automático:** Decide a saída baseada na conexão.
  - **Alto-Falante:** Força o áudio externo.
  - **Fone/Discreto:** Tenta usar o áudio de chamada para não incomodar ao redor.
  - **Silencioso:** Apenas vibração.
- **🔍 Busca Inteligente:** Pesquise por endereço ("Av Paulista, 1000") ou coordenadas ("-23.55, -46.63") usando a API do Nominatim.

## 🛠️ Tecnologias Utilizadas

- **React Native** (Expo SDK 52)
- **Expo Router** (Navegação baseada em arquivos)
- **React Native WebView** (Renderização do Mapa Leaflet)
- **Expo Location & Task Manager** (Geolocalização em Background)
- **Expo Notifications** (Alertas Push Locais)
- **Expo AV** (Reprodução de sons de alarme)
- **Expo SQLite** (Banco de dados local)
- **Leaflet.js** (Interface de Mapa)

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Node.js instalado.
- Conta na Expo (opcional, mas recomendada para builds).

### Instalação

1. Clone o repositório:
```bash
   git clone [https://github.com/seu-usuario/alerta-local.git](https://github.com/seu-usuario/alerta-local.git)
   cd alerta-local
```

2. Instale as dependências:
```bash
   npm install
```

3. Gere o APK (Recomendado para testar Background/Notificações):
Devido às limitações do **Expo Go** com tarefas de segundo plano, recomenda-se gerar um APK de preview:
```bash
   npx eas build -p android --profile preview
```

4. Ou rode em desenvolvimento (com limitações):
```bash
   npx expo start
```

## ⚙️ Permissões Necessárias (Android)

Para que o aplicativo funcione corretamente enquanto você dorme na viagem, é necessário conceder permissões especiais:

1. **Localização:** Permitir "O Tempo Todo" (Allow all the time). Isso é crucial para o `ACCESS_BACKGROUND_LOCATION`.
2. **Notificações:** Permitir para receber os avisos visuais.

## 📱 Estrutura do Projeto

* `/app`: Rotas e telas (Expo Router).
* `/components`: Componentes reutilizáveis (ControlPanel, UI).
* `/hooks`: Lógica de Áudio (`useAlarmSystem`) e Temas.
* `/services`:
* `database.ts`: Gerenciamento do SQLite.
* `backgroundTask.ts`: Lógica do "Robô" que roda em segundo plano.

* `/assets`: Imagens e sons customizados.

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir Issues ou Pull Requests.

1. Faça um Fork do projeto
2. Crie sua Feature Branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona: MinhaFeature'`)
4. Push para a Branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](https://www.google.com/search?q=LICENSE) para mais detalhes.