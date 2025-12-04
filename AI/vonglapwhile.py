def InputData():
    a = int (input("Nhap a ="))
    b = int (input("Nhap b ="))
    return a,b

def UCLN (a,b):
    while a != b:
        if a>b:
            a = a-b
        else:
            b = b-a
    return a

def UCLNDQ(a,b):
    if a > b:
        return UCLNDQ(a-b,b)
    elif b > a:
        return UCLNDQ(a,b-a)
    return a

def main():
    a,b = InputData()
    c = UCLN(a,b)
    d= UCLNDQ(a,b)
    print("UCLN = %d"%c)
    print("UCLNDQ = %d"%d)

if __name__=="__main__":
    main()
