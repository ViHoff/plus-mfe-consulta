import React, { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Chip,
} from "@mui/material";
import { secureFetch, RefreshTokenNotFoundError, InvalidRefreshTokenError } from "../api";

interface TestResult {
  id: number;
  name: string;
  description: string;
  status: "idle" | "running" | "passed" | "failed";
  message?: string;
}

export default function TestApi() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([
    {
      id: 1,
      name: "1. Falha sem Refresh Token",
      description: "Verifica se secureFetch falha com RefreshTokenNotFoundError quando o localStorage está vazio.",
      status: "idle",
    },
    {
      id: 2,
      name: "2. Sucesso com Access Token Válido",
      description: "Verifica se secureFetch funciona diretamente com um token de acesso válido.",
      status: "idle",
    },
    {
      id: 3,
      name: "3. Auto-Refresh e Repetição",
      description: "Verifica se secureFetch renova o token após um 401, atualiza o localStorage e repete a chamada com sucesso.",
      status: "idle",
    },
    {
      id: 4,
      name: "4. Limpeza de Storage em caso de falha",
      description: "Verifica se o localStorage é completamente limpo quando o refresh token é inválido/expirado.",
      status: "idle",
    },
  ]);

  const updateTestStatus = (id: number, status: TestResult["status"], message?: string) => {
    setResults((prev) =>
      prev.map((test) => (test.id === id ? { ...test, status, message } : test))
    );
  };

  const runAllTests = async () => {
    setRunning(true);
    
    // Backup current localStorage state
    const backupAccess = localStorage.getItem("access_token");
    const backupRefresh = localStorage.getItem("refresh_token");

    try {
      // ----------------------------------------------------
      // TEST 1: secureFetch with no tokens
      // ----------------------------------------------------
      updateTestStatus(1, "running");
      localStorage.clear();
      try {
        await secureFetch("http://localhost:3067/consulta/buscarPecas");
        updateTestStatus(1, "failed", "Deveria ter lançado RefreshTokenNotFoundError.");
      } catch (err: any) {
        if (err instanceof RefreshTokenNotFoundError || err.name === "RefreshTokenNotFoundError") {
          updateTestStatus(1, "passed", "Lançou RefreshTokenNotFoundError com sucesso.");
        } else {
          updateTestStatus(1, "failed", `Lançou erro incorreto: ${err.message}`);
        }
      }

      // ----------------------------------------------------
      // Setup Helper: Register & Login to get real tokens
      // ----------------------------------------------------
      const testEmail = `tester_${Date.now()}@example.com`;
      const testPassword = "Password123";
      let activeAccessToken = "";
      let activeRefreshToken = "";

      try {
        // Register user
        const regRes = await fetch("http://localhost:3001/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail, password: testPassword }),
        });
        if (!regRes.ok) throw new Error("Falha no cadastro do usuário de teste.");

        // Login user
        const logRes = await fetch("http://localhost:3001/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail, password: testPassword }),
        });
        if (!logRes.ok) throw new Error("Falha no login do usuário de teste.");
        
        const tokens = await logRes.json();
        activeAccessToken = tokens.access_token;
        activeRefreshToken = tokens.refresh_token;
      } catch (err: any) {
        updateTestStatus(2, "failed", `Erro de setup (Autenticação): ${err.message}`);
        updateTestStatus(3, "failed", "Pulado devido à falha no setup.");
        updateTestStatus(4, "failed", "Pulado devido à falha no setup.");
        return;
      }

      // ----------------------------------------------------
      // TEST 2: secureFetch with valid access token
      // ----------------------------------------------------
      updateTestStatus(2, "running");
      localStorage.setItem("access_token", activeAccessToken);
      localStorage.setItem("refresh_token", activeRefreshToken);

      try {
        const res = await secureFetch("http://localhost:3067/consulta/buscarPecas");
        if (res.ok) {
          updateTestStatus(2, "passed", "Efetuou chamada direta 200 OK com token válido.");
        } else {
          updateTestStatus(2, "failed", `Servidor respondeu com status ${res.status}`);
        }
      } catch (err: any) {
        updateTestStatus(2, "failed", `Lançou erro inesperado: ${err.message}`);
      }

      // ----------------------------------------------------
      // TEST 3: secureFetch with expired access token but valid refresh token
      // ----------------------------------------------------
      updateTestStatus(3, "running");
      // Set access token to invalid/expired
      localStorage.setItem("access_token", "expired_or_invalid_access_token");
      localStorage.setItem("refresh_token", activeRefreshToken);

      try {
        const res = await secureFetch("http://localhost:3067/consulta/buscarPecas");
        const newAccess = localStorage.getItem("access_token");
        
        if (res.ok && newAccess && newAccess !== "expired_or_invalid_access_token") {
          updateTestStatus(3, "passed", "Renovou token após 401 e completou a chamada com sucesso.");
        } else {
          updateTestStatus(3, "failed", "Chamada falhou ou token não foi atualizado no localStorage.");
        }
      } catch (err: any) {
        updateTestStatus(3, "failed", `Erro na renovação/repetição: ${err.message}`);
      }

      // ----------------------------------------------------
      // TEST 4: secureFetch with expired access token and invalid refresh token
      // ----------------------------------------------------
      updateTestStatus(4, "running");
      localStorage.setItem("access_token", "invalid_access_token");
      localStorage.setItem("refresh_token", "invalid_refresh_token");

      try {
        await secureFetch("http://localhost:3067/consulta/buscarPecas");
        updateTestStatus(4, "failed", "Deveria ter falhado.");
      } catch (err: any) {
        const isCleared = localStorage.getItem("access_token") === null && localStorage.getItem("refresh_token") === null;
        if (isCleared) {
          updateTestStatus(4, "passed", "Lançou erro de renovação e limpou o localStorage com sucesso.");
        } else {
          updateTestStatus(4, "failed", `Lançou erro (${err.message}), mas o localStorage não foi limpo.`);
        }
      }

    } finally {
      // Restore backup localStorage state
      localStorage.clear();
      if (backupAccess) localStorage.setItem("access_token", backupAccess);
      if (backupRefresh) localStorage.setItem("refresh_token", backupRefresh);
      setRunning(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3, background: "linear-gradient(145deg, #ffffff, #f0f0f0)" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight="bold" color="primary">
            Validador de Token Refresh & secureFetch
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            disabled={running}
            onClick={runAllTests}
            sx={{ fontWeight: "bold", borderRadius: 2 }}
          >
            {running ? <CircularProgress size={24} color="inherit" /> : "Iniciar Testes"}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Este utilitário simula o fluxo do token no frontend. Ele backupa suas credenciais, roda testes em tempo real contra as portas 3001 (Auth) e 3067 (Consulta), e restaura sua sessão original ao finalizar.
        </Typography>
        <Divider />
        <List sx={{ mt: 2 }}>
          {results.map((test) => (
            <React.Fragment key={test.id}>
              <ListItem
                alignItems="flex-start"
                secondaryAction={
                  <Box display="flex" alignItems="center" gap={1}>
                    {test.status === "idle" && <Chip label="Aguardando" variant="outlined" size="small" />}
                    {test.status === "running" && <CircularProgress size={20} />}
                    {test.status === "passed" && <Chip label="Sucesso" color="success" size="small" />}
                    {test.status === "failed" && <Chip label="Falhou" color="error" size="small" />}
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight="bold">
                      {test.name}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {test.description}
                      </Typography>
                      {test.message && (
                        <Typography variant="caption" display="block" color={test.status === "failed" ? "error" : "primary"} sx={{ mt: 0.5, fontStyle: "italic" }}>
                          Resultado: {test.message}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Container>
  );
}
