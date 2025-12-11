def InputData():
    n = int (input("n= "))
    return n

def Giaithua(n):
    s= 1
    for i in range(1,n+1):
        s = s * i
    return s


def GTDQ(n):
    if n == 0:
        return 1
    return n*GTDQ(n-1)

def main():
 #   n = int(input("n= "))
    n = InputData()
    s = GTDQ(n)
    print("%d"%n,"!= %d"%s )

if __name__=="__main__":
    main()
