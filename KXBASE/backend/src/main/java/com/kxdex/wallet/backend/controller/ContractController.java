package com.kxdex.wallet.backend.controller;

import java.util.Map;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kxdex.wallet.backend.model.ContractCallRequest;
import com.kxdex.wallet.backend.model.ContractCompileRequest;
import com.kxdex.wallet.backend.model.ContractSendRequest;
import com.kxdex.wallet.backend.model.OrderSignRequest;
import com.kxdex.wallet.backend.service.ContractCompilerService;
import com.kxdex.wallet.backend.service.ContractExecutionService;
import com.kxdex.wallet.backend.service.ContractRegistryService;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/v1/contracts")
@Validated
public class ContractController {

    private final ContractExecutionService contractExecutionService;
    private final ContractRegistryService contractRegistryService;
    private final ContractCompilerService contractCompilerService;

    public ContractController(ContractExecutionService contractExecutionService,
                              ContractRegistryService contractRegistryService,
                              ContractCompilerService contractCompilerService) {
        this.contractExecutionService = contractExecutionService;
        this.contractRegistryService = contractRegistryService;
        this.contractCompilerService = contractCompilerService;
    }

    @GetMapping("/addresses")
    public Map<String, String> getAddresses() {
        return contractRegistryService.getContracts();
    }

    @PostMapping("/addresses/reload")
    public Map<String, String> reloadAddresses() {
        contractRegistryService.reload();
        return contractRegistryService.getContracts();
    }

    @PostMapping("/call")
    public Map<String, Object> call(@Valid @RequestBody ContractCallRequest request) {
        return contractExecutionService.call(request);
    }

    @PostMapping("/send")
    public Map<String, Object> send(@Valid @RequestBody ContractSendRequest request) {
        return contractExecutionService.send(request);
    }

    @PostMapping("/sign-order")
    public Map<String, Object> signOrder(@RequestBody OrderSignRequest request) {
        return contractExecutionService.signOrder(request);
    }

    @PostMapping("/compile")
    public Map<String, Object> compile(@RequestBody(required = false) ContractCompileRequest request) {
        ContractCompileRequest effective = request == null ? new ContractCompileRequest() : request;
        return contractCompilerService.compileWithConsole(effective);
    }
}
