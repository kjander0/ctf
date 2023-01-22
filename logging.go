package main

import (
	"fmt"
	"log"
)

func LogDebug(items ...interface{}) {
	msg := "DEBUG: " + fmt.Sprint(items...)
	log.Println(msg)
}

func LogDebugf(fmt string, items ...interface{}) {
	log.Printf("DEBUG: "+fmt, items...)
}

func LogInfo(items ...interface{}) {
	msg := "INFO: " + fmt.Sprint(items...)
	log.Println(msg)
}

func LogInfof(fmt string, items ...interface{}) {
	log.Printf("INFO: "+fmt, items...)
}

func LogError(items ...interface{}) {
	msg := "ERROR: " + fmt.Sprint(items...)
	log.Println(msg)
}

func LogErrorf(fmt string, items ...interface{}) {
	log.Printf("ERROR: "+fmt, items...)
}

func LogPanic(items ...interface{}) {
	msg := "PANIC: " + fmt.Sprint(items...)
	log.Panic(msg)
}

func LogPanicf(fmt string, items ...interface{}) {
	log.Panicf("PANIC: "+fmt, items...)
}
