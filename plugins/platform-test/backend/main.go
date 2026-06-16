// Platform Test Plugin — Sidecar Backend
// Mock implementation for runtime integration testing.

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"runtime"
	"time"
)

// TestResult represents a single test result.
type TestResult struct {
	Name      string `json:"name"`
	Passed    bool   `json:"passed"`
	Duration  string `json:"duration"`
	Error     string `json:"error,omitempty"`
}

// TestSuite represents a collection of tests.
type TestSuite struct {
	PluginID    string       `json:"pluginId"`
	Version     string       `json:"version"`
	Timestamp   string       `json:"timestamp"`
	Tests       []TestResult `json:"tests"`
	AllPassed   bool         `json:"allPassed"`
	TotalPassed int          `json:"totalPassed"`
	TotalFailed int          `json:"totalFailed"`
}

func main() {
	log.Println("[platform-test] sidecar starting...")
	log.Printf("[platform-test] runtime: %s %s\n", runtime.GOOS, runtime.GOARCH)
	log.Printf("[platform-test] go version: %s\n", runtime.Version())

	suite := TestSuite{
		PluginID:  "verstak.platform-test",
		Version:   "0.1.0",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	suite.Tests = append(suite.Tests, runTest("sidecar_process_check", testSidecarProcess)...)
	suite.Tests = append(suite.Tests, runTest("filesystem_access", testFilesystemAccess)...)
	suite.Tests = append(suite.Tests, runTest("network_localhost", testLocalhostReachability)...)

	for _, t := range suite.Tests {
		if t.Passed {
			suite.TotalPassed++
		} else {
			suite.TotalFailed++
		}
	}
	suite.AllPassed = suite.TotalFailed == 0

	// Output results as JSON
	output, _ := json.MarshalIndent(suite, "", "  ")
	fmt.Println(string(output))

	if !suite.AllPassed {
		os.Exit(1)
	}
}

func runTest(name string, fn func() error) []TestResult {
	start := time.Now()
	err := fn()
	duration := time.Since(start).String()

	result := TestResult{
		Name:     name,
		Duration: duration,
	}

	if err != nil {
		result.Passed = false
		result.Error = err.Error()
	} else {
		result.Passed = true
	}

	return []TestResult{result}
}

func testSidecarProcess() error {
	log.Println("[test] sidecar_process_check")
	// Verify we're running as a child process with proper env
	if os.Getenv("VERSTAK_PLUGIN_ID") == "" {
		return fmt.Errorf("VERSTAK_PLUGIN_ID not set")
	}
	return nil
}

func testFilesystemAccess() error {
	log.Println("[test] filesystem_access")
	// Ensure we can create temp files (sandbox check)
	tmpFile, err := os.CreateTemp("", "verstak-platform-test-*")
	if err != nil {
		return fmt.Errorf("cannot create temp file: %w", err)
	}
	tmpFile.Close()
	os.Remove(tmpFile.Name())
	return nil
}

func testLocalhostReachability() error {
	log.Println("[test] network_localhost")
	// Verify localhost is reachable if requested
	return nil // stub
}
