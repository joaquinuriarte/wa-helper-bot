# WhatsApp Helper Bot

## Overview

This project is a WhatsApp helper bot designed to assist users with various tasks, with a primary focus on calendar management. The bot is architected with a clean, layered approach to ensure separation of concerns and maintainability.

## Core Functionality

*   **Natural Language Understanding:** Parses user messages sent via WhatsApp to determine intent and extract relevant information.
*   **Agent-based Task Execution:** Utilizes an agent system (powered by LangChain and a configured LLM like Gemini) to perform actions based on available tools.
*   **Calendar Management:**
    *   Allows users to create, list, modify, and delete calendar events using natural language.
    *   Integrates with Google Calendar for event storage and management.
    *   Includes an event parsing tool to structure natural language requests into actionable calendar event details.
*   **WhatsApp Integration:** Interacts with users directly through the WhatsApp messaging platform.
*   **Extensible Architecture:** Designed to potentially incorporate more tools and functionalities for the agent.

## How it Works (High-Level Flow)

1.  **WhatsApp Session:** A WhatsApp session is established, connecting the bot to the messaging platform.
2.  **Handler Configuration:** A handler factory configures which WhatsApp group chats the bot supports, providing group-specific information such as calendar IDs, operational instructions, and available tools for the agent.
3.  **Message Reception:** The bot receives a user's message from a supported chat.
4.  **Agent Processing:** The message is relayed to an AI agent. The agent analyzes the request and, through a series of internal steps (ReAct-style process), determines which tools are needed to fulfill the request and how to use them.
5.  **Tool Execution:** The agent invokes the necessary tools (e.g., calendar tool, event parsing tool).
6.  **Response Generation:** Based on the outcome of tool execution, the agent formulates a response.
7.  **User Reply:** The final response is relayed back to the user via WhatsApp.

## Folder Structure

The project follows a layered architecture, separating concerns into distinct directories. The questions below conceptually guide the purpose of each layer:

```
.
├── app.js                      # Main application entry point, initializes and wires components.
├── package.json                # Project metadata, dependencies, and scripts.
├── README.md                   # This file.
├── .gitignore                  # Specifies intentionally untracked files for Git.
│
├── application/                # Orchestrates application use cases: "How do I use available tools to complete the request?"
│   ├── factories/              # Responsible for creating instances (e.g., handlerFactory.js).
│   ├── interfaces/             # Defines contracts (e.g., IHandlers.js, IInteractionPort.js) for how different parts should interact.
│   ├── models/                 # Application-specific data models (e.g., Message.js).
│   └── services/               # Application services and business logic orchestration (e.g., botLogic.js, chatHandlers/).
│
├── domain/                     # Core business logic, entities, and rules: "What are my capabilities and core concepts?"
│   ├── agent/                  # Domain logic for agent capabilities (e.g., AgentService.js, models like AgentRequest.js defining what an agent processes).
│   └── calendar/               # Domain logic for calendar functionalities (e.g., CalendarContext.js defining calendar-related data).
│
├── env/                        # Environment-specific configurations (e.g., API keys, credentials).
│
├── infrastructure/             # Implementations of interfaces (defined in domain/application), interaction with external services: "How do I actually execute specific tools/skills or talk to external systems?"
│   ├── agents/                 # Concrete agent implementations (e.g., LangchainAgentPlatform.js, session managers for agent state).
│   └── calendar/               # Concrete calendar service implementations (e.g., GoogleCalendarInfrastructure.js, EventParserInfrastructure.js using Google Calendar API).
│
├── interaction/                # Handles communication with the external world (e.g., messaging platforms): "How do I send/receive messages to/from the user?"
│   ├── whatsappDriver.js       # Manages interaction with the WhatsApp platform (e.g., using a library like whatsapp-web.js).
│   └── sessionManagers/        # Session management specific to the interaction layer (if any).
│
└── node_modules/               # Contains all third-party Node.js project dependencies.
```
