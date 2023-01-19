package main

import (
	"fmt"
	"log"
)

func logDebug(items ...interface{}) {
	msg := "DEBUG: " + fmt.Sprint(items...)
	log.Println(msg)
}

func logDebugf(fmt string, items ...interface{}) {
	log.Printf("DEBUG: "+fmt, items...)
}

func logInfo(items ...interface{}) {
	msg := "INFO: " + fmt.Sprint(items...)
	log.Println(msg)
}

func logInfof(fmt string, items ...interface{}) {
	log.Printf("INFO: "+fmt, items...)
}

func logError(items ...interface{}) {
	msg := "ERROR: " + fmt.Sprint(items...)
	log.Println(msg)
}

func logErrorf(fmt string, items ...interface{}) {
	log.Printf("ERROR: "+fmt, items...)
}

func logPanic(items ...interface{}) {
	msg := "PANIC: " + fmt.Sprint(items...)
	log.Panic(msg)
}

func logPanicf(fmt string, items ...interface{}) {
	log.Panicf("PANIC: "+fmt, items...)
}
